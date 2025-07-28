# Ollama Reranker 集成指南

## 概述

本指南将帮助你集成 Ollama Reranker（如 `dengcao/Qwen3-Reranker-8B`）到 AnythingLLM 的 RAG 流程中，以提高检索结果的准确性。

## 环境变量配置

在你的 `.env` 文件中添加以下配置：

```bash
# Reranker 配置
RERANKER_PROVIDER=ollama                    # 使用 ollama 作为 reranker 提供商
RERANKER_BASE_PATH=http://localhost:11434   # Ollama 服务地址
RERANKER_MODEL_PREF=dengcao/Qwen3-Reranker-8B  # Reranker 模型名称
RERANKER_AUTH_TOKEN=                        # 如果需要认证，设置此项（可选）

# 现有的 Embedding 配置（保持不变）
EMBEDDING_ENGINE=ollama
EMBEDDING_BASE_PATH=http://localhost:11434
EMBEDDING_MODEL_PREF=qwen2.5:7b-instruct    # 你的 embedding 模型

# 向量数据库配置（保持不变）
VECTOR_DB=pgvector
# ... 其他 PGVector 配置
```

## Ollama 模型准备

1. **拉取 Reranker 模型**：
```bash
ollama pull dengcao/Qwen3-Reranker-8B
```

2. **验证模型可用性**：
```bash
ollama list
```

确保你能看到 `dengcao/Qwen3-Reranker-8B` 模型在列表中。

## 工作流程

### 1. 文档存储阶段
- 文档通过 Ollama Embedding 模型（如 `qwen2.5:7b-instruct`）进行向量化
- 向量存储到 PGVector 数据库中

### 2. 查询检索阶段
- 用户查询通过相同的 Embedding 模型进行向量化
- 在 PGVector 中进行相似性搜索，获取初始候选文档（通常是 topN 的 3 倍，最多 50 个）
- 如果启用了 reranking（`workspace.vectorSearchMode === "rerank"`），则：
  - 使用 Ollama Reranker 模型对候选文档进行重排序
  - 返回重排序后的 top-K 结果

### 3. 答案生成阶段
- 将重排序后的上下文文档传递给 LLM
- LLM 基于高质量的上下文生成答案

## 启用 Reranking

在 AnythingLLM 的工作空间设置中：

1. 进入工作空间设置
2. 找到 "Vector Search Mode" 选项
3. 选择 "Rerank" 模式

或者通过 API 设置：
```javascript
// 更新工作空间配置
{
  "vectorSearchMode": "rerank"
}
```

## 性能优化建议

### 1. 模型选择
- **Embedding 模型**：选择适合你领域的模型，如 `qwen2.5:7b-instruct`
- **Reranker 模型**：`dengcao/Qwen3-Reranker-8B` 在中文场景下表现优秀

### 2. 参数调优
- **topN**：初始检索的文档数量，建议 10-20
- **similarityThreshold**：相似性阈值，建议 0.25-0.5
- **rerank topK**：最终返回的文档数量，通常 3-5 个

### 3. 硬件要求
- **内存**：Reranker 模型需要额外的 GPU/CPU 内存
- **延迟**：Reranking 会增加查询延迟，但提高准确性

## 故障排除

### 1. 模型未找到
```
Error: Reranker model dengcao/Qwen3-Reranker-8B is not available
```
**解决方案**：确保已拉取模型 `ollama pull dengcao/Qwen3-Reranker-8B`

### 2. 服务连接失败
```
Error: Ollama service could not be reached
```
**解决方案**：
- 检查 Ollama 服务是否运行：`ollama serve`
- 验证 `RERANKER_BASE_PATH` 配置是否正确

### 3. Reranking 失败回退
如果 reranking 过程失败，系统会自动回退到原始的向量搜索结果，确保服务的可用性。

## 监控和日志

系统会输出详细的日志信息：

```
[OllamaEmbeddingReranker] Reranking 15 documents with model dengcao/Qwen3-Reranker-8B...
[OllamaEmbeddingReranker] Reranking 15 documents to top 4 took 2340ms
```

通过这些日志可以监控 reranking 的性能和状态。

## 高级配置

### 自定义 Prompt 格式

如果需要调整 reranker 的 prompt 格式，可以修改 `OllamaEmbeddingReranker` 类中的 `#buildRerankPrompt` 方法：

```javascript
#buildRerankPrompt(query, document) {
  // 根据你的模型要求调整格式
  return `查询: ${query}\n文档: ${document}\n相关性评分 (0-1):`;
}
```

### 批量处理优化

对于大量文档的场景，可以考虑实现批量 reranking 以提高效率。

## 总结

通过集成 Ollama Reranker，你的 RAG 系统将能够：

1. **提高检索准确性**：通过二阶段检索，先召回后精排
2. **保持系统稳定性**：失败时自动回退到原始结果
3. **支持中文优化**：使用专门的中文 reranker 模型
4. **灵活配置**：支持多种 reranker 提供商和模型

这将显著提升你的 RAG 系统在中文场景下的表现。
