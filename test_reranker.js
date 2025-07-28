#!/usr/bin/env node

/**
 * Ollama Reranker 测试脚本
 * 用于验证 Ollama Reranker 的功能是否正常
 */

require('dotenv').config();

async function testOllamaReranker() {
  console.log('🚀 开始测试 Ollama Reranker...\n');

  try {
    // 设置测试环境变量
    process.env.RERANKER_PROVIDER = 'ollama';
    process.env.RERANKER_BASE_PATH = process.env.RERANKER_BASE_PATH || 'http://localhost:11434';
    process.env.RERANKER_MODEL_PREF = process.env.RERANKER_MODEL_PREF || 'dengcao/Qwen3-Reranker-8B';

    console.log('📋 配置信息:');
    console.log(`   Provider: ${process.env.RERANKER_PROVIDER}`);
    console.log(`   Base Path: ${process.env.RERANKER_BASE_PATH}`);
    console.log(`   Model: ${process.env.RERANKER_MODEL_PREF}\n`);

    // 导入 reranker 类
    const { getEmbeddingRerankerClass } = require('./server/utils/helpers');
    
    console.log('🔧 初始化 Reranker...');
    const reranker = getEmbeddingRerankerClass();
    
    // 测试查询和文档
    const query = "什么是人工智能？";
    const documents = [
      {
        text: "人工智能（AI）是计算机科学的一个分支，致力于创建能够执行通常需要人类智能的任务的系统。",
        id: "doc1",
        source: "AI百科"
      },
      {
        text: "机器学习是人工智能的一个子集，它使计算机能够在没有明确编程的情况下学习和改进。",
        id: "doc2", 
        source: "ML指南"
      },
      {
        text: "今天天气很好，适合出门散步。阳光明媚，温度适宜。",
        id: "doc3",
        source: "天气报告"
      },
      {
        text: "深度学习是机器学习的一个分支，使用神经网络来模拟人脑的工作方式。",
        id: "doc4",
        source: "深度学习教程"
      },
      {
        text: "自然语言处理（NLP）是人工智能的一个重要应用领域，专注于计算机与人类语言的交互。",
        id: "doc5",
        source: "NLP概述"
      }
    ];

    console.log('📝 测试数据:');
    console.log(`   查询: "${query}"`);
    console.log(`   文档数量: ${documents.length}`);
    console.log('   文档列表:');
    documents.forEach((doc, i) => {
      console.log(`     ${i + 1}. [${doc.source}] ${doc.text.substring(0, 50)}...`);
    });
    console.log();

    // 执行 reranking
    console.log('🔄 执行 Reranking...');
    const startTime = Date.now();
    
    const results = await reranker.rerank(query, documents, { topK: 3 });
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`✅ Reranking 完成! 耗时: ${duration}ms\n`);

    // 显示结果
    console.log('📊 Reranking 结果:');
    console.log('排名 | 分数   | 来源        | 内容');
    console.log('-'.repeat(80));
    
    results.forEach((result, index) => {
      const rank = index + 1;
      const score = result.rerank_score.toFixed(3);
      const source = result.source || 'Unknown';
      const content = result.text.substring(0, 40) + '...';
      
      console.log(`${rank.toString().padStart(4)} | ${score} | ${source.padEnd(10)} | ${content}`);
    });

    console.log('\n🎯 分析:');
    
    // 检查结果是否合理
    const topResult = results[0];
    const expectedRelevantSources = ['AI百科', 'ML指南', 'NLP概述', '深度学习教程'];
    
    if (expectedRelevantSources.includes(topResult.source)) {
      console.log('✅ Top 结果看起来相关性很高');
    } else {
      console.log('⚠️  Top 结果的相关性可能不够高');
    }

    // 检查分数分布
    const scores = results.map(r => r.rerank_score);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    
    console.log(`   分数范围: ${minScore.toFixed(3)} - ${maxScore.toFixed(3)}`);
    
    if (maxScore > minScore + 0.1) {
      console.log('✅ 分数分布合理，有明显区分度');
    } else {
      console.log('⚠️  分数分布较平，区分度不够明显');
    }

    // 性能评估
    const avgTimePerDoc = duration / documents.length;
    console.log(`   平均每文档处理时间: ${avgTimePerDoc.toFixed(1)}ms`);
    
    if (avgTimePerDoc < 500) {
      console.log('✅ 处理速度良好');
    } else if (avgTimePerDoc < 1000) {
      console.log('⚠️  处理速度一般，可考虑优化');
    } else {
      console.log('❌ 处理速度较慢，建议检查配置');
    }

    console.log('\n🎉 测试完成！Ollama Reranker 工作正常。');

  } catch (error) {
    console.error('\n❌ 测试失败:');
    console.error(`   错误: ${error.message}`);
    
    if (error.message.includes('not available')) {
      console.error('\n💡 解决建议:');
      console.error('   1. 确保 Ollama 服务正在运行: ollama serve');
      console.error(`   2. 拉取 reranker 模型: ollama pull ${process.env.RERANKER_MODEL_PREF}`);
      console.error('   3. 检查环境变量配置是否正确');
    } else if (error.message.includes('could not be reached')) {
      console.error('\n💡 解决建议:');
      console.error('   1. 检查 RERANKER_BASE_PATH 是否正确');
      console.error('   2. 确保 Ollama 服务可访问');
      console.error('   3. 检查网络连接');
    }
    
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testOllamaReranker();
}

module.exports = { testOllamaReranker };
