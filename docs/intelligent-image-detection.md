# 智能图片检测功能

## 概述

智能图片检测功能能够自动识别向量数据库检索结果中包含的图片文件引用，并自动显示相关的图片预览组件。当用户询问问题时，如果检索到的文档中包含图片文件（.png, .jpg等），系统会自动展示这些图片。

## 工作原理

### 1. 图片文件检测

系统会检查以下位置的图片文件扩展名：
- `source.title` - 文档标题
- `source.chunkSource` - 文档来源路径  
- `source.text` - 文档内容文本

支持的图片格式：
```javascript
const IMAGE_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', 
  '.webp', '.svg', '.tiff', '.ico'
];
```

### 2. 检测逻辑

```javascript
function detectImagesInSources(sources = []) {
  const imageFiles = [];
  
  sources.forEach((source, index) => {
    const title = source.title || '';
    const chunkSource = source.chunkSource || '';
    const text = source.text || '';
    
    const hasImageExtension = IMAGE_EXTENSIONS.some(ext => 
      title.toLowerCase().includes(ext) || 
      chunkSource.toLowerCase().includes(ext) ||
      text.toLowerCase().includes(ext)
    );
    
    if (hasImageExtension) {
      // 生成图片对象...
    }
  });
  
  return imageFiles;
}
```

### 3. 自动显示

当检测到图片文件时，系统会：
1. 在常规消息之前插入 `ImageGuideMessage` 组件
2. 使用占位图片URL（当前使用 picsum.photos 提供的随机风景图）
3. 显示图片的缩略图网格和大图预览功能

## 使用示例

### 向量数据库中的图片文件引用

```javascript
const sources = [
  {
    title: "操作流程截图.png",
    chunkSource: "file://documents/guides/操作流程截图.png",
    text: "这是操作流程的详细截图，包含了所有必要的步骤说明。"
  },
  {
    title: "界面示例.jpg", 
    chunkSource: "file://documents/screenshots/界面示例.jpg",
    text: "用户界面的示例图片，展示了各个功能模块的位置。"
  }
];
```

### 自动生成的图片对象

```javascript
{
  id: "detected_image_0",
  title: "操作流程截图",
  thumbnail: "https://picsum.photos/400/300?random=1",
  fullsize: "https://picsum.photos/1200/900?random=1", 
  alt: "检测到的图片: 操作流程截图.png",
  source: { /* 原始source对象 */ }
}
```

## 配置选项

### 占位图片服务

当前使用 picsum.photos 作为占位图片服务：
- 缩略图：400x300 像素
- 高清图：1200x900 像素
- 随机参数确保每张图片不同

### 自定义图片URL

在实际部署中，可以替换为：
- 实际的图片文件URL
- CDN链接
- 本地存储的图片路径

## 调试信息

系统会输出详细的调试日志：

```javascript
console.log(`🖼️ [图片检测] 发现图片文件: ${fileName}`, {
  title,
  chunkSource, 
  imageIndex,
  thumbnailUrl: imageUrls[imageIndex]
});

console.log(`🔍 [消息处理] 检测图片结果:`, {
  role: props.role,
  hasSources: !!props.sources,
  sourcesCount: props.sources?.length || 0,
  detectedImagesCount: detectedImages.length,
  sources: props.sources,
  detectedImages
});
```

## 扩展功能

### 1. 实际图片下载

可以扩展为从实际的文件路径下载图片：

```javascript
async function downloadActualImage(filePath) {
  try {
    const response = await fetch(`/api/files/download?path=${encodeURIComponent(filePath)}`);
    if (response.ok) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
  } catch (error) {
    console.error('图片下载失败:', error);
  }
  return null;
}
```

### 2. 图片缓存

实现图片缓存机制避免重复下载：

```javascript
const imageCache = new Map();

function getCachedImage(filePath) {
  if (imageCache.has(filePath)) {
    return imageCache.get(filePath);
  }
  
  const imageUrl = downloadActualImage(filePath);
  imageCache.set(filePath, imageUrl);
  return imageUrl;
}
```

### 3. 图片元数据

扩展图片对象包含更多元数据：

```javascript
{
  id: "detected_image_0",
  title: "操作流程截图",
  thumbnail: "...",
  fullsize: "...",
  alt: "...",
  metadata: {
    fileSize: "2.5MB",
    dimensions: "1920x1080", 
    format: "PNG",
    lastModified: "2024-01-15T10:30:00Z"
  },
  source: { /* 原始source对象 */ }
}
```

## 最佳实践

1. **性能优化**：使用懒加载和图片压缩
2. **错误处理**：提供占位图和错误提示
3. **用户体验**：支持图片预览和下载功能
4. **安全性**：验证图片文件类型和大小
5. **可访问性**：提供适当的alt文本和键盘导航

## 故障排除

### 常见问题

1. **图片不显示**
   - 检查控制台日志确认检测逻辑
   - 验证图片URL是否可访问
   - 确认图片文件扩展名匹配

2. **检测不准确**
   - 调整 `IMAGE_EXTENSIONS` 列表
   - 优化检测逻辑的匹配条件
   - 检查向量数据库中的文件路径格式

3. **性能问题**
   - 实现图片懒加载
   - 使用适当的图片尺寸
   - 考虑使用CDN加速
