// 重新处理文档脚本
// 运行方式: cd server && node reprocess-document.js

require('dotenv').config();
const { Workspace } = require('./models/workspace');
const { Document } = require('./models/documents');
const { getVectorDbClass } = require('./utils/helpers');

async function reprocessDocument() {
  try {
    console.log('🔄 开始重新处理文档...');
    
    // 1. 查找工作空间
    const workspaces = await Workspace.where();
    if (workspaces.length === 0) {
      console.log('❌ 未找到工作空间');
      return;
    }
    
    const workspace = workspaces[0]; // 使用第一个工作空间
    console.log(`📁 使用工作空间: ${workspace.name} (${workspace.slug})`);
    
    // 2. 查找停车记录文档
    const documents = await Document.where({
      workspaceId: workspace.id
    });
    
    const parkingDoc = documents.find(doc => 
      doc.filename && doc.filename.includes('停车记录')
    );
    
    if (!parkingDoc) {
      console.log('❌ 未找到停车记录文档');
      console.log('📋 现有文档:', documents.map(d => d.filename));
      return;
    }
    
    console.log(`📄 找到文档: ${parkingDoc.filename}`);
    
    // 3. 获取向量数据库实例
    const VectorDb = getVectorDbClass();
    
    // 4. 删除现有向量数据
    console.log('🗑️  删除现有向量数据...');
    await VectorDb.deleteDocumentFromNamespace(
      workspace.slug,
      parkingDoc.docpath
    );
    
    // 5. 重新向量化文档
    console.log('🔄 重新向量化文档...');
    const result = await VectorDb.addDocumentToNamespace(
      workspace.slug,
      {
        id: parkingDoc.id,
        title: parkingDoc.filename,
        pageContent: parkingDoc.cached_vectors || '重新处理文档内容',
        docSource: parkingDoc.filename,
        chunkSource: parkingDoc.filename,
        published: new Date().toISOString(),
        wordCount: 1000
      },
      parkingDoc.docpath
    );
    
    if (result.vectorized) {
      console.log('✅ 文档重新向量化成功！');
      
      // 6. 验证向量数据
      const count = await VectorDb.namespaceCount(workspace.slug);
      console.log(`📊 工作空间 "${workspace.slug}" 中现有 ${count} 个向量`);
      
    } else {
      console.log('❌ 文档向量化失败:', result.error);
    }
    
  } catch (error) {
    console.error('❌ 重新处理文档时出错:', error.message);
    console.error('🔍 详细错误:', error);
  }
}

// 检查当前嵌入引擎配置
async function checkEmbeddingConfig() {
  try {
    const { getEmbeddingEngineSelection } = require('./utils/helpers');
    const embedder = getEmbeddingEngineSelection();
    
    console.log('🔧 当前嵌入引擎配置:');
    console.log('   引擎类型:', process.env.EMBEDDING_ENGINE || 'openai');
    console.log('   引擎实例:', embedder.constructor.name);
    
    // 测试嵌入功能
    console.log('🧪 测试嵌入功能...');
    const testText = '测试文本向量化';
    const embedding = await embedder.embedTextInput(testText);
    
    if (embedding && embedding.length > 0) {
      console.log('✅ 嵌入功能正常');
      console.log(`📏 向量维度: ${embedding.length}`);
    } else {
      console.log('❌ 嵌入功能异常');
    }
    
  } catch (error) {
    console.error('❌ 嵌入引擎测试失败:', error.message);
  }
}

// 主函数
async function main() {
  console.log('=== 文档重新处理工具 ===\n');
  
  // 检查配置
  await checkEmbeddingConfig();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // 重新处理文档
  await reprocessDocument();
}

// 运行
main().catch(console.error);
