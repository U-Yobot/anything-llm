const { Ollama } = require("ollama");

class OllamaEmbeddingReranker {
  constructor() {
    if (!process.env.RERANKER_BASE_PATH) {
      throw new Error("No reranker base path was set. Please set RERANKER_BASE_PATH environment variable.");
    }
    if (!process.env.RERANKER_MODEL_PREF) {
      throw new Error("No reranker model was set. Please set RERANKER_MODEL_PREF environment variable.");
    }

    this.basePath = process.env.RERANKER_BASE_PATH;
    this.model = process.env.RERANKER_MODEL_PREF; // 例如: "dengcao/Qwen3-Reranker-8B"
    this.authToken = process.env.RERANKER_AUTH_TOKEN;
    
    const headers = this.authToken 
      ? { Authorization: `Bearer ${this.authToken}` }
      : {};
      
    this.client = new Ollama({
      host: this.basePath,
      headers: headers,
    });
    
    this.log("Initialized");
  }

  log(text, ...args) {
    console.log(`\x1b[36m[OllamaEmbeddingReranker]\x1b[0m ${text}`, ...args);
  }

  /**
   * 检查Ollama服务是否可用
   * @returns {Promise<boolean>}
   */
  async #isAlive() {
    try {
      const models = await this.client.list();
      return models && models.models && models.models.length > 0;
    } catch (e) {
      this.log(`Service check failed: ${e.message}`);
      return false;
    }
  }

  /**
   * 检查指定的reranker模型是否可用
   * @returns {Promise<boolean>}
   */
  async #isModelAvailable() {
    try {
      const models = await this.client.list();
      const availableModels = models.models.map(m => m.name);
      const isAvailable = availableModels.includes(this.model);
      
      if (!isAvailable) {
        this.log(`Model ${this.model} not found. Available models: ${availableModels.join(', ')}`);
        this.log(`Please pull the model first: ollama pull ${this.model}`);
      }
      
      return isAvailable;
    } catch (e) {
      this.log(`Model availability check failed: ${e.message}`);
      return false;
    }
  }

  /**
   * 预加载reranker模型
   */
  async preload() {
    try {
      this.log(`Preloading reranker model ${this.model}...`);
      
      if (!(await this.#isAlive())) {
        throw new Error("Ollama service is not available");
      }
      
      if (!(await this.#isModelAvailable())) {
        throw new Error(`Reranker model ${this.model} is not available`);
      }
      
      // 发送一个测试请求来预热模型
      await this.client.generate({
        model: this.model,
        prompt: "test",
        options: {
          num_predict: 1,
        },
      });
      
      this.log(`Preloaded reranker model. Reranking is available as a service now.`);
    } catch (e) {
      console.error(e);
      this.log(`Failed to preload reranker model. Reranking will be available on the first rerank call.`);
    }
  }

  /**
   * 使用Ollama reranker对文档进行重排序
   * @param {string} query - 查询文本
   * @param {{text: string}[]} documents - 需要重排序的文档列表
   * @param {Object} options - 选项
   * @param {number} options.topK - 返回的top文档数量
   * @returns {Promise<any[]>} - 重排序后的文档列表
   */
  async rerank(query, documents, options = { topK: 4 }) {
    if (!(await this.#isAlive())) {
      throw new Error("Ollama service could not be reached. Is Ollama running?");
    }
    
    if (!(await this.#isModelAvailable())) {
      throw new Error(`Reranker model ${this.model} is not available. Please pull it first: ollama pull ${this.model}`);
    }

    const start = Date.now();
    this.log(`Reranking ${documents.length} documents with model ${this.model}...`);

    try {
      const results = [];
      
      // 为每个文档计算与查询的相关性分数
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        
        // 构建reranker的输入格式
        // 不同的reranker模型可能需要不同的输入格式
        // 这里使用通用的query-document对格式
        const prompt = this.#buildRerankPrompt(query, doc.text);
        
        try {
          const response = await this.client.generate({
            model: this.model,
            prompt: prompt,
            options: {
              num_predict: 10, // 限制输出长度，只需要分数
              temperature: 0.1, // 低温度确保一致性
            },
          });
          
          // 解析reranker的输出分数
          const score = this.#parseRerankScore(response.response);
          
          results.push({
            rerank_corpus_id: i,
            rerank_score: score,
            ...doc,
          });
          
        } catch (err) {
          this.log(`Error reranking document ${i}: ${err.message}`);
          // 如果单个文档rerank失败，给它一个默认低分数
          results.push({
            rerank_corpus_id: i,
            rerank_score: 0.0,
            ...doc,
          });
        }
      }
      
      // 按分数降序排序并返回topK结果
      const reranked = results
        .sort((a, b) => b.rerank_score - a.rerank_score)
        .slice(0, options.topK);

      this.log(
        `Reranking ${documents.length} documents to top ${options.topK} took ${Date.now() - start}ms`
      );
      
      return reranked;
      
    } catch (error) {
      this.log(`Reranking failed: ${error.message}`);
      throw new Error(`Ollama reranking failed: ${error.message}`);
    }
  }

  /**
   * 构建reranker的输入prompt
   * @param {string} query - 查询文本
   * @param {string} document - 文档文本
   * @returns {string} - 格式化的prompt
   */
  #buildRerankPrompt(query, document) {
    // 根据你使用的Qwen3-Reranker模型的要求调整prompt格式
    // 这里提供一个通用格式，你可能需要根据模型文档调整
    return `Query: ${query}\nDocument: ${document}\nRelevance Score (0-1):`;
  }

  /**
   * 解析reranker输出的分数
   * @param {string} response - 模型的响应
   * @returns {number} - 解析出的分数 (0-1)
   */
  #parseRerankScore(response) {
    try {
      // 尝试从响应中提取数字分数
      const scoreMatch = response.match(/(\d+\.?\d*)/);
      if (scoreMatch) {
        let score = parseFloat(scoreMatch[1]);
        // 确保分数在0-1范围内
        if (score > 1) score = score / 10; // 如果是0-10范围，转换为0-1
        return Math.max(0, Math.min(1, score));
      }
      
      // 如果无法解析数字，尝试解析文本描述
      const lowerResponse = response.toLowerCase();
      if (lowerResponse.includes('high') || lowerResponse.includes('relevant')) {
        return 0.8;
      } else if (lowerResponse.includes('medium') || lowerResponse.includes('moderate')) {
        return 0.5;
      } else if (lowerResponse.includes('low') || lowerResponse.includes('irrelevant')) {
        return 0.2;
      }
      
      // 默认中等分数
      return 0.5;
      
    } catch (err) {
      this.log(`Error parsing rerank score from response: ${response}. Error: ${err.message}`);
      return 0.5; // 默认分数
    }
  }
}

module.exports = {
  OllamaEmbeddingReranker,
};
