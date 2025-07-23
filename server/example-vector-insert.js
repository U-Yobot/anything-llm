// 示例：如何向 PostgreSQL 插入向量数据
// 运行方式: cd server && node example-vector-insert.js [1|2]

const { v4: uuidv4 } = require("uuid");

// 确保在 server 目录中运行
process.chdir(__dirname);

// 加载环境变量
require("dotenv").config();

// 检查必要的环境变量
if (!process.env.PGVECTOR_CONNECTION_STRING) {
  console.error("❌ 错误: 未找到 PGVECTOR_CONNECTION_STRING 环境变量");
  console.log("💡 请确保在 .env 文件中配置了 PostgreSQL 连接字符串");
  process.exit(1);
}

async function insertVectorExample() {
  // 1. 导入 PGVector 模块
  const PGVector = require("./utils/vectorDbProviders/pgvector/index.js");

  try {
    console.log("🔄 连接到 PGVector 数据库...");

    // 2. 建立连接
    const connection = await PGVector.connect();

    // 3. 准备示例数据
    const namespace = "example-workspace"; // 工作空间标识
    const dimensions = 768; // 向量维度（根据你的嵌入模型）

    // 示例向量数据
    const submissions = [
      {
        id: uuidv4(),
        vector: Array.from({ length: dimensions }, () => Math.random()), // 随机向量
        metadata: {
          title: "示例文档1",
          source: "example.pdf",
          chunk_index: 0,
          text: "这是第一个文档块的内容...",
        },
      },
      {
        id: uuidv4(),
        vector: Array.from({ length: dimensions }, () => Math.random()), // 随机向量
        metadata: {
          title: "示例文档2",
          source: "example.pdf",
          chunk_index: 1,
          text: "这是第二个文档块的内容...",
        },
      },
    ];

    console.log(`📝 准备插入 ${submissions.length} 个向量...`);

    // 4. 插入向量数据
    const result = await PGVector.updateOrCreateCollection({
      connection,
      submissions,
      namespace,
      dimensions,
    });

    if (result) {
      console.log("✅ 向量数据插入成功！");

      // 5. 验证插入结果
      const count = await PGVector.namespaceCount(namespace);
      console.log(`📊 命名空间 "${namespace}" 中现有 ${count} 个向量`);

      // 6. 测试相似性搜索
      console.log("🔍 测试相似性搜索...");
      const searchVector = Array.from({ length: dimensions }, () =>
        Math.random()
      );

      const searchResults = await PGVector.similarityResponse({
        client: connection,
        namespace,
        queryVector: searchVector,
        similarityThreshold: 0.5,
        topN: 2,
      });

      console.log("🎯 搜索结果:", {
        找到的文档数: searchResults.contextTexts.length,
        相似度分数: searchResults.contextTexts.map(
          (_, i) => searchResults.sourceDocuments[i]?.similarity || "N/A"
        ),
      });
    } else {
      console.log("❌ 向量数据插入失败");
    }

    // 7. 关闭连接
    await connection.end();
    console.log("🔚 数据库连接已关闭");
  } catch (error) {
    console.error("❌ 错误:", error.message);
    console.error("🔍 详细信息:", error);
  }
}

// 实际使用嵌入模型的示例
async function insertRealVectorExample() {
  const PGVector = require("./utils/vectorDbProviders/pgvector/index.js");
  const { getEmbeddingEngineSelection } = require("./utils/helpers");

  try {
    console.log("🔄 使用真实嵌入模型插入向量...");

    const connection = await PGVector.connect();
    const namespace = "real-example-workspace";

    // 获取配置的嵌入引擎
    const LLMConnector = getEmbeddingEngineSelection();

    // 要嵌入的文本
    const texts = [
      "AnythingLLM 是一个强大的文档聊天系统",
      "它支持多种向量数据库，包括 PostgreSQL + pgvector",
      "用户可以上传文档并与之进行智能对话",
    ];

    console.log(`📝 正在为 ${texts.length} 个文本生成嵌入...`);

    // 生成真实的向量嵌入
    const embeddings = await LLMConnector.embedChunks(texts);

    // 准备插入数据
    const submissions = embeddings.map((embedding, index) => ({
      id: uuidv4(),
      vector: embedding,
      metadata: {
        title: `文档片段 ${index + 1}`,
        text: texts[index],
        chunk_index: index,
        source: "manual_insert",
      },
    }));

    // 插入向量数据
    const result = await PGVector.updateOrCreateCollection({
      connection,
      submissions,
      namespace,
      dimensions: embeddings[0].length,
    });

    if (result) {
      console.log("✅ 真实向量数据插入成功！");
      console.log(`📊 向量维度: ${embeddings[0].length}`);
    }

    await connection.end();
  } catch (error) {
    console.error("❌ 真实向量插入错误:", error.message);
  }
}

// 运行示例
console.log("选择运行模式:");
console.log("1. 随机向量示例");
console.log("2. 真实嵌入向量示例");

const mode = process.argv[2] || "1";

if (mode === "1") {
  insertVectorExample();
} else if (mode === "2") {
  insertRealVectorExample();
} else {
  console.log("请指定模式: node example-vector-insert.js [1|2]");
}
