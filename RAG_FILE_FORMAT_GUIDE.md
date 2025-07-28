# RAG 文件格式处理流程指南

## 📋 概述

本指南说明了如何在 RAG 流程中正确处理图片和视频文件的引用格式，确保 LLM 输出的文件引用能被正确检测和渲染。

## 🔄 完整流程

### 1. **RAG 前置提示词**（服务端）

在 `server/utils/chats/index.js` 的 `chatPrompt` 函数中，我们添加了文件格式保持指令：

```javascript
const fileFormatInstruction = `

IMPORTANT FILE REFERENCE INSTRUCTIONS:
When referencing image files in your response, you MUST use the exact format: [!filename.extension]
When referencing video files in your response, you MUST use the exact format: [@filename.extension]

Examples:
- For image files: [!步骤1.jpg], [!界面截图.png], [!操作流程.jpeg]
- For video files: [@演示视频.mp4], [@教程.avi], [@操作指南.mov]

DO NOT modify these file reference formats or convert them to plain text. Keep the brackets and special characters exactly as shown. This formatting is required for the system to properly detect and display the media files to users.`;
```

### 2. **LLM 输出**（保持原始格式）

LLM 会按照指令输出包含特殊格式的文件引用：

```
管理员会直接向指定车主发放优惠券（具体操作可参考[!步骤1.jpg]和[!步骤2.png]）。

如需查看详细演示，请观看[@操作演示.mp4]。
```

### 3. **文件检测**（前端）

在 `frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/index.jsx` 中，`detectImagesInResponse` 函数会检测这些格式：

```javascript
// 图片检测
const imageRegex = /\[!([\u4e00-\u9fa5a-zA-Z0-9_.-]+\.(png|jpg|jpeg|gif|bmp|webp|svg|tiff|ico))\]/gi;

// 视频检测  
const videoRegex = /\[@([\u4e00-\u9fa5a-zA-Z0-9_.-]+\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v|3gp|ogv))\]/gi;
```

### 4. **格式转换**（前端显示）

在 `HistoricalMessage/index.jsx` 中，`convertFileMarkersToFriendlyFormat` 函数会将格式转换为用户友好的显示：

```javascript
// [!步骤1.jpg] -> **步骤1.jpg**
// [@演示.mp4] -> **演示.mp4**
```

### 5. **媒体渲染**（前端）

检测到的文件会在消息下方渲染为实际的图片和视频组件。

## 🎯 用户看到的效果

### 输入场景
用户问：如何操作优惠券发放？

### LLM 原始输出（内部格式）
```
管理员会直接向指定车主发放优惠券（具体操作可参考[!步骤1.jpg]和[!步骤2.png]）。

详细演示请查看[@操作指南.mp4]。
```

### 用户看到的显示
```
管理员会直接向指定车主发放优惠券（具体操作可参考**步骤1.jpg**和**步骤2.png**）。

详细演示请查看**操作指南.mp4**。

[这里会显示实际的图片组件]
📷 步骤1.jpg    📷 步骤2.png

[这里会显示实际的视频组件]  
🎬 操作指南.mp4
```

## ⚙️ 技术实现细节

### 服务端修改

1. **chatPrompt 函数增强**：
   - 位置：`server/utils/chats/index.js`
   - 功能：在系统提示词中添加文件格式保持指令
   - 确保 LLM 输出正确的文件引用格式

### 前端修改

1. **保持原有检测逻辑**：
   - 位置：`frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/index.jsx`
   - 功能：检测 `[!图片.jpg]` 和 `[@视频.mp4]` 格式
   - 生成媒体文件渲染数据

2. **添加格式转换函数**：
   - 位置：`frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/HistoricalMessage/index.jsx`
   - 功能：将内部格式转换为用户友好显示
   - 在渲染前应用转换

## 🔧 配置要求

### 环境变量
无需额外配置，使用现有的 LLM 和前端设置。

### 文件支持格式

**图片格式**：
- png, jpg, jpeg, gif, bmp, webp, svg, tiff, ico

**视频格式**：
- mp4, avi, mov, wmv, flv, webm, mkv, m4v, 3gp, ogv

## 🧪 测试验证

### 测试用例 1：基本图片引用
```
输入：如何登录系统？
期望输出：请参考[!登录界面.png]进行操作
用户看到：请参考**登录界面.png**进行操作 + 图片组件
```

### 测试用例 2：混合媒体引用
```
输入：完整的操作流程是什么？
期望输出：查看[!流程图.jpg]，然后观看[@演示.mp4]
用户看到：查看**流程图.jpg**，然后观看**演示.mp4** + 图片和视频组件
```

### 测试用例 3：中文文件名
```
输入：用户管理怎么操作？
期望输出：参考[!用户管理界面.png]和[@用户管理演示.mp4]
用户看到：参考**用户管理界面.png**和**用户管理演示.mp4** + 媒体组件
```

## 🚀 优势

1. **格式一致性**：LLM 始终输出标准格式的文件引用
2. **检测准确性**：避免误匹配普通文本中的文件名
3. **用户体验**：显示友好的文件名，同时提供实际的媒体预览
4. **系统稳定性**：内部格式和显示格式分离，便于维护

## 🔍 故障排除

### 问题 1：文件没有被检测到
**原因**：LLM 没有使用正确的格式
**解决**：检查系统提示词是否正确添加

### 问题 2：格式显示异常
**原因**：格式转换函数有问题
**解决**：检查 `convertFileMarkersToFriendlyFormat` 函数

### 问题 3：媒体文件不显示
**原因**：检测逻辑或渲染组件问题
**解决**：检查 `detectImagesInResponse` 和媒体渲染组件

## 📝 维护说明

1. **添加新文件格式**：在正则表达式中添加新的扩展名
2. **修改显示样式**：调整 `convertFileMarkersToFriendlyFormat` 函数
3. **更新提示词**：根据需要修改 `chatPrompt` 中的指令

这个方案确保了文件引用在整个 RAG 流程中的一致性和准确性，同时提供了良好的用户体验。
