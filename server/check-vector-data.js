// 检查向量数据脚本
// 运行方式: cd server && node check-vector-data.js

require('dotenv').config();
const { Workspace } = require('./models/workspace');
const { getVectorDbClass } = require('./utils/helpers');

async function checkVectorData() {
  try {
    console.log('🔍 检查向量数据状态...\n');
    
    // 1. 检查工作空间
    const workspaces = await Workspace.where();
    console.log(`📁 找到 ${workspaces.length} 个工作空间:`);
    
    for (const workspace of workspaces) {
      console.log(`   - ${workspace.name} (${workspace.slug})`);
    }
    
    if (workspaces.length === 0) {
      console.log('❌ 未找到工作空间');
      return;
    }
    
    // 2. 检查向量数据库连接
    const VectorDb = getVectorDbClass();
    console.log(`\n🔗 向量数据库类型: ${VectorDb.name}`);
    
    // 3. 检查每个工作空间的向量数据
    for (const workspace of workspaces) {
      console.log(`\n📊 检查工作空间 "${workspace.name}" 的向量数据:`);
      
      try {
        // 检查向量数量
        const count = await VectorDb.namespaceCount(workspace.slug);
        console.log(`   向量数量: ${count}`);
        
        if (count > 0) {
          // 获取一些示例向量
          const { client } = await VectorDb.connect();
          const sampleQuery = `
            SELECT 
              id,
              substring(metadata->>'text', 1, 100) as content_preview,
              created_at
            FROM "${VectorDb.tableName()}" 
            WHERE namespace = $1 
            ORDER BY created_at DESC 
            LIMIT 3
          `;
          
          const result = await client.query(sampleQuery, [workspace.slug]);
          
          console.log('   📄 示例向量内容:');
          result.rows.forEach((row, index) => {
            console.log(`     ${index + 1}. ${row.content_preview}...`);
            console.log(`        ID: ${row.id}`);
            console.log(`        时间: ${row.created_at}`);
          });
          
          await client.end();
        } else {
          console.log('   ⚠️  该工作空间没有向量数据');
        }
        
      } catch (error) {
        console.log(`   ❌ 检查失败: ${error.message}`);
      }
    }
    
    // 4. 测试向量搜索
    console.log('\n🧪 测试向量搜索功能...');
    const testWorkspace = workspaces[0];
    
    try {
      const searchResult = await VectorDb.performSimilaritySearch({
        namespace: testWorkspace.slug,
        input: "粤B12345",
        LLMConnector: null,
        similarityThreshold: 0.5,
        topN: 3
      });
      
      console.log(`✅ 搜索测试成功，找到 ${searchResult.contextTexts.length} 个相关结果`);
      
      if (searchResult.contextTexts.length > 0) {
        console.log('   🎯 搜索结果预览:');
        searchResult.contextTexts.slice(0, 2).forEach((text, index) => {
          console.log(`     ${index + 1}. ${text.substring(0, 80)}...`);
        });
      }
      
    } catch (error) {
      console.log(`❌ 搜索测试失败: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ 检查向量数据时出错:', error.message);
  }
}

// 检查聊天配置
async function checkChatConfig() {
  try {
    console.log('\n⚙️  检查聊天配置...');
    
    const workspaces = await Workspace.where();
    for (const workspace of workspaces) {
      console.log(`\n📋 工作空间 "${workspace.name}" 的聊天配置:`);
      console.log(`   聊天模式: ${workspace.chatMode || 'chat'}`);
      console.log(`   向量搜索模式: ${workspace.vectorSearchMode || 'default'}`);
      console.log(`   相似度阈值: ${workspace.similarityThreshold || 0.25}`);
      console.log(`   返回结果数: ${workspace.topN || 4}`);
    }
    
  } catch (error) {
    console.error('❌ 检查聊天配置时出错:', error.message);
  }
}

// 主函数
async function main() {
  console.log('=== 向量数据检查工具 ===\n');
  
  await checkVectorData();
  await checkChatConfig();
  
  console.log('\n💡 使用建议:');
  console.log('1. 确保工作空间有向量数据');
  console.log('2. 在 Web UI 中进入正确的工作空间');
  console.log('3. 确保聊天模式支持向量搜索');
  console.log('4. 使用具体的关键词进行查询');
}

main().catch(console.error);
