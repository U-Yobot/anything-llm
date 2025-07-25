# 图片指南集成文档

## 概述

本文档描述如何在 AnythingLLM 中集成图片指南功能，支持在对话中展示操作步骤图片。

## 数据结构

### 向量数据库存储格式

```json
{
  "content": "开票流程说明：请按照以下步骤进行开票操作",
  "type": "imageGuide",
  "title": "发票开具操作指南",
  "images": [
    {
      "id": "invoice_step1",
      "title": "第一步：登录系统",
      "thumbnail": "https://your-oss.com/thumbs/invoice_step1_thumb.jpg",
      "fullsize": "https://your-oss.com/images/invoice_step1_full.jpg",
      "alt": "登录系统界面截图"
    },
    {
      "id": "invoice_step2",
      "title": "第二步：填写发票信息",
      "thumbnail": "https://your-oss.com/thumbs/invoice_step2_thumb.jpg",
      "fullsize": "https://your-oss.com/images/invoice_step2_full.jpg",
      "alt": "发票信息填写页面截图"
    }
  ]
}
```

### 后端响应格式

```json
{
  "uuid": "msg-12345",
  "type": "imageGuide",
  "role": "assistant",
  "content": "开票流程说明：请按照以下步骤进行开票操作",
  "title": "发票开具操作指南",
  "images": [
    {
      "id": "invoice_step1",
      "title": "第一步：登录系统",
      "thumbnail": "https://your-oss.com/thumbs/invoice_step1_thumb.jpg",
      "fullsize": "https://your-oss.com/images/invoice_step1_full.jpg",
      "alt": "登录系统界面截图"
    }
  ],
  "animate": false,
  "pending": false
}
```

## 集成步骤

### 1. 准备图片资源

#### 图片规格建议：
- **缩略图**: 400x300px, JPEG格式, 质量80%
- **高清图**: 1200x900px, JPEG/PNG格式, 质量90%
- **文件命名**: `{category}_{step}_{type}.jpg`

#### OSS存储结构：
```
/images/
  /guides/
    /invoice/
      /thumbs/
        - step1_thumb.jpg
        - step2_thumb.jpg
      /full/
        - step1_full.jpg
        - step2_full.jpg
```

### 2. 向量数据库配置

在文档处理时，识别包含图片指南的内容：

```python
def process_image_guide_document(content, images_data):
    """
    处理包含图片指南的文档
    """
    return {
        "content": content,
        "type": "imageGuide",
        "metadata": {
            "images": images_data,
            "category": "operation_guide"
        }
    }
```

### 3. 后端 API 修改

在聊天响应中检测图片指南类型：

```javascript
// 在 chat 处理逻辑中
if (retrievedDoc.type === 'imageGuide') {
  return {
    uuid: generateUUID(),
    type: "imageGuide",
    role: "assistant",
    content: retrievedDoc.content,
    title: retrievedDoc.metadata.title || "操作指南",
    images: retrievedDoc.metadata.images || [],
    animate: false,
    pending: false
  };
}
```

## 运营维护

### 图片更新流程

1. **准备新图片**：按照规格要求制作图片
2. **上传到OSS**：保持文件路径结构一致
3. **更新向量数据库**：修改对应文档的图片链接
4. **测试验证**：确认图片正常显示和下载

### 批量管理工具

```javascript
// 图片管理工具示例
const imageManager = {
  // 批量上传图片
  async uploadImages(category, images) {
    const results = [];
    for (const image of images) {
      const thumbnail = await this.generateThumbnail(image);
      const thumbUrl = await this.uploadToOSS(thumbnail, `thumbs/${image.name}`);
      const fullUrl = await this.uploadToOSS(image, `full/${image.name}`);
      
      results.push({
        id: image.id,
        title: image.title,
        thumbnail: thumbUrl,
        fullsize: fullUrl,
        alt: image.alt
      });
    }
    return results;
  },

  // 更新向量数据库
  async updateVectorDB(docId, imageData) {
    await vectorDB.update(docId, {
      type: "imageGuide",
      images: imageData
    });
  }
};
```

## 最佳实践

### 1. 性能优化
- 使用CDN加速图片加载
- 实现图片懒加载
- 缩略图压缩优化

### 2. 用户体验
- 提供图片加载失败的占位图
- 支持键盘导航（左右箭头切换图片）
- 移动端适配优化

### 3. 运营友好
- 图片命名规范化
- 版本控制和回滚机制
- 使用统计和效果分析

## 扩展功能

### 1. 图片标注
支持在图片上添加标注点，指出关键操作位置

### 2. 视频指南
扩展支持视频教程，提供更丰富的指导内容

### 3. 交互式指南
结合用户操作状态，提供个性化的步骤指导

## 监控和分析

### 关键指标
- 图片指南展示次数
- 用户下载率
- 用户停留时间
- 问题解决率

### 日志记录
```javascript
// 记录用户交互
analytics.track('image_guide_viewed', {
  guide_id: 'invoice_guide',
  user_id: userId,
  step_viewed: stepIndex,
  timestamp: Date.now()
});
```
