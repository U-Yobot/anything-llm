const axios = require("axios");
const https = require("https");

// 自定义 HTTPS Agent 配置
const httpsAgent = new https.Agent({
  keepAlive: true,
  timeout: 120000, // 2分钟超时
  maxSockets: 50,
  maxFreeSockets: 10,
  family: 4, // 强制使用 IPv4
  rejectUnauthorized: true,
});

// 自定义 OpenAI 客户端类
class CustomOpenAiClient {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    
    this.apiKey = apiKey;
    this.baseURL = "https://api.openai.com/v1";
    this.timeout = 120000; // 2分钟超时
    this.maxRetries = 4;
    this.retryDelay = 1000; // 1秒基础延迟
    
    // 创建 axios 实例
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      httpsAgent: httpsAgent,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "AnythingLLM-CustomClient/1.0",
      },
    });

    // 添加请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[CustomOpenAiClient] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error("[CustomOpenAiClient] Request error:", error.message);
        return Promise.reject(error);
      }
    );

    // 添加响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        if (error.response) {
          console.error(`[CustomOpenAiClient] HTTP Status: ${error.response.status}`);
          console.error(`[CustomOpenAiClient] Response:`, error.response.data);
        } else if (error.request) {
          console.error("[CustomOpenAiClient] Network error:", error.message);
        } else {
          console.error("[CustomOpenAiClient] Error:", error.message);
        }
        return Promise.reject(error);
      }
    );

    console.log("[CustomOpenAiClient] Initialized with custom HTTP client");
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 重试逻辑
  async withRetry(operation, context = "") {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        console.error(`[CustomOpenAiClient] Error calling ${context} (attempt ${attempt}/${this.maxRetries}):`, error.message);
        
        if (attempt === this.maxRetries) {
          break;
        }
        
        // 计算延迟时间（指数退避）
        const delayTime = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`[CustomOpenAiClient] Retrying in ${delayTime}ms...`);
        await this.delay(delayTime);
      }
    }
    
    throw lastError;
  }

  // 嵌入 API
  async embeddings(params) {
    return this.withRetry(async () => {
      const response = await this.client.post("/embeddings", params);
      return response.data;
    }, "/embeddings");
  }

  // 聊天完成 API
  async chatCompletions(params) {
    return this.withRetry(async () => {
      const response = await this.client.post("/chat/completions", params);
      return response.data;
    }, "/chat/completions");
  }

  // 流式聊天完成 API
  async streamChatCompletions(params) {
    return this.withRetry(async () => {
      const response = await this.client.post("/chat/completions", params, {
        responseType: 'stream'
      });
      return response;
    }, "/chat/completions (stream)");
  }

  // 模型列表 API
  async listModels() {
    return this.withRetry(async () => {
      const response = await this.client.get("/models");
      return response.data;
    }, "/models");
  }

  // 获取单个模型信息
  async getModel(modelId) {
    return this.withRetry(async () => {
      const response = await this.client.get(`/models/${modelId}`);
      return response.data;
    }, `/models/${modelId}`);
  }

  // 文件上传 API
  async uploadFile(formData) {
    return this.withRetry(async () => {
      const response = await this.client.post("/files", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    }, "/files");
  }

  // 文件列表 API
  async listFiles() {
    return this.withRetry(async () => {
      const response = await this.client.get("/files");
      return response.data;
    }, "/files");
  }

  // 删除文件 API
  async deleteFile(fileId) {
    return this.withRetry(async () => {
      const response = await this.client.delete(`/files/${fileId}`);
      return response.data;
    }, `/files/${fileId}`);
  }

  // 批处理 API
  async createBatch(params) {
    return this.withRetry(async () => {
      const response = await this.client.post("/batches", params);
      return response.data;
    }, "/batches");
  }

  // 获取批处理状态
  async getBatch(batchId) {
    return this.withRetry(async () => {
      const response = await this.client.get(`/batches/${batchId}`);
      return response.data;
    }, `/batches/${batchId}`);
  }

  // 列出批处理
  async listBatches() {
    return this.withRetry(async () => {
      const response = await this.client.get("/batches");
      return response.data;
    }, "/batches");
  }
}

// 自定义 OpenAI 嵌入引擎类
class CustomOpenAiEmbedder {
  constructor() {
    this.client = new CustomOpenAiClient(process.env.OPEN_AI_KEY);
    this.model = process.env.EMBEDDING_MODEL_PREF || "text-embedding-ada-002";
    this.maxConcurrentChunks = process.env
      .GENERIC_OPEN_AI_EMBEDDING_MAX_CONCURRENT_CHUNKS
      ? parseInt(process.env.GENERIC_OPEN_AI_EMBEDDING_MAX_CONCURRENT_CHUNKS)
      : 500;
    this.embeddingMaxChunkLength = 8191;

    console.log(
      `[CustomOpenAiEmbedder] Initialized ${this.model} with custom HTTP client`
    );
  }

  log(text, ...args) {
    console.log(`\x1b[36m[CustomOpenAiEmbedder]\x1b[0m ${text}`, ...args);
  }

  // 单个文本嵌入
  async embedTextInput(textInput) {
    try {
      const response = await this.client.embeddings({
        model: this.model,
        input: textInput,
        encoding_format: "float",
      });

      if (response && response.data && response.data[0]) {
        return response.data[0].embedding;
      } else {
        console.error(
          "[CustomOpenAiEmbedder] Invalid response format:",
          JSON.stringify(response, null, 2)
        );
        throw new Error("Invalid response format from OpenAI API");
      }
    } catch (error) {
      console.error(
        `[CustomOpenAiEmbedder] Error embedding text:`,
        error.message
      );
      if (error.response) {
        console.error(
          `[CustomOpenAiEmbedder] Response data:`,
          error.response.data
        );
      }
      throw error;
    }
  }

  // 批量嵌入
  async embedChunks(textChunks = []) {
    this.log(`Embedding ${textChunks.length} chunks...`);
    const embeddings = [];
    const batchSize = 100; // 每批处理的文本数量

    for (let i = 0; i < textChunks.length; i += batchSize) {
      const batch = textChunks.slice(i, i + batchSize);
      this.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(textChunks.length / batchSize)}`);

      try {
        const response = await this.client.embeddings({
          model: this.model,
          input: batch,
          encoding_format: "float",
        });

        if (response && response.data) {
          const batchEmbeddings = response.data.map((item) => item.embedding);
          embeddings.push(...batchEmbeddings);

          console.log(
            `[CustomOpenAiEmbedder] Batch completed. Total tokens used: ${response.usage ? response.usage.total_tokens : "N/A"}`
          );
        } else {
          throw new Error("Invalid response format from OpenAI API");
        }

        // 添加小延迟避免速率限制
        if (i + batchSize < textChunks.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(
          `[CustomOpenAiEmbedder] Error in batch ${Math.floor(i / batchSize) + 1}:`,
          error.message
        );
        throw error;
      }
    }

    this.log(`Completed embedding ${textChunks.length} chunks`);
    return embeddings;
  }
}

module.exports = {
  CustomOpenAiClient,
  CustomOpenAiEmbedder,
};
