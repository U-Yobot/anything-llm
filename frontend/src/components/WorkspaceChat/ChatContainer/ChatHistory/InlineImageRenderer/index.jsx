import React, { useState } from "react";
import { Eye, X } from "@phosphor-icons/react";

// 内联图片渲染组件
export default function InlineImageRenderer({ images = [], className = "" }) {
  const [selectedImage, setSelectedImage] = useState(null);

  console.log(`🖼️ [InlineImageRenderer] 渲染图片组件:`, {
    imagesCount: images.length,
    images: images.map((img) => ({
      id: img.id,
      title: img.title,
      thumbnail: img.thumbnail,
      alt: img.alt,
    })),
    className,
  });

  if (!images || images.length === 0) {
    console.log(`❌ [InlineImageRenderer] 没有图片数据，不渲染`);
    return null;
  }

  return (
    <>
      {/* 内联图片网格 */}
      <div className={`my-4 ${className}`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative overflow-hidden transition-colors border rounded-lg cursor-pointer group bg-theme-bg-secondary border-theme-modal-border hover:border-blue-500"
              onClick={() => setSelectedImage(image)}
            >
              {/* 图片容器 */}
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                <img
                  src={image.thumbnail}
                  alt={image.alt}
                  className="object-cover w-full h-full transition-transform group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    console.log(`❌ [图片加载失败] ${image.thumbnail}`);
                    // 设置备用图片
                    e.target.src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='200' y='150' text-anchor='middle' fill='%236b7280' font-family='Arial' font-size='16'%3E图片加载中...%3C/text%3E%3C/svg%3E";
                  }}
                  onLoad={() => {
                    console.log(`✅ [图片加载成功] ${image.thumbnail}`);
                  }}
                />

                {/* 悬停遮罩 */}
                <div className="absolute inset-0 flex items-center justify-center transition-all bg-black bg-opacity-0 group-hover:bg-opacity-20">
                  <Eye className="w-6 h-6 text-white transition-opacity opacity-0 group-hover:opacity-100" />
                </div>
              </div>

              {/* 图片标题 */}
              <div className="p-3">
                <h4 className="text-sm font-medium truncate text-theme-text-primary">
                  {image.title}
                </h4>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 大图预览模态框 */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative max-w-4xl max-h-[90vh] mx-4">
            {/* 关闭按钮 */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute right-0 text-white transition-colors -top-10 hover:text-gray-300"
            >
              <X className="w-8 h-8" />
            </button>

            {/* 大图 */}
            <img
              src={selectedImage.fullsize}
              alt={selectedImage.alt}
              className="object-contain max-w-full max-h-full rounded-lg"
            />

            {/* 图片信息 */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white bg-black bg-opacity-75 rounded-b-lg">
              <h3 className="text-lg font-semibold">{selectedImage.title}</h3>
              <p className="mt-1 text-sm text-gray-300">{selectedImage.alt}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 处理消息内容，将图片引用替换为内联图片组件
export function processMessageWithInlineImages(message, detectedImages) {
  if (!detectedImages || detectedImages.length === 0) {
    return { processedMessage: message, hasImages: false };
  }

  let processedMessage = message;
  const imageReferences = [];

  // 查找消息中的图片文件名引用
  detectedImages.forEach((image, index) => {
    const fileName = image.source?.title || image.title;
    const fileNameWithExt = fileName.includes(".")
      ? fileName
      : `${fileName}.png`;

    // 创建图片引用标记
    const imageMarker = `[IMAGE_${index}]`;

    // 替换消息中的图片文件名为标记
    const patterns = [fileName, fileNameWithExt, image.title].filter(Boolean);

    patterns.forEach((pattern) => {
      const regex = new RegExp(
        pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "gi"
      );
      if (processedMessage.match(regex)) {
        processedMessage = processedMessage.replace(regex, imageMarker);
        if (!imageReferences.includes(index)) {
          imageReferences.push(index);
        }
      }
    });
  });

  // 如果没有找到引用，在消息末尾添加图片
  if (imageReferences.length === 0) {
    processedMessage += "\n\n[IMAGES_ALL]";
    return {
      processedMessage,
      hasImages: true,
      imageReferences: detectedImages.map((_, index) => index),
      allImagesAtEnd: true,
    };
  }

  return {
    processedMessage,
    hasImages: true,
    imageReferences,
    allImagesAtEnd: false,
  };
}

// 渲染处理后的消息内容
export function renderMessageWithImages(
  processedMessage,
  detectedImages,
  imageReferences,
  allImagesAtEnd
) {
  if (!detectedImages || detectedImages.length === 0) {
    return processedMessage;
  }

  let content = processedMessage;

  // 替换图片标记为实际的图片组件
  if (allImagesAtEnd) {
    content = content.replace("[IMAGES_ALL]", "");
    return (
      <div>
        <div dangerouslySetInnerHTML={{ __html: content }} />
        <InlineImageRenderer images={detectedImages} />
      </div>
    );
  } else {
    // 逐个替换图片标记
    imageReferences.forEach((index) => {
      const imageMarker = `[IMAGE_${index}]`;
      const image = detectedImages[index];
      if (image) {
        content = content.replace(
          imageMarker,
          `<div class="inline-image-placeholder" data-image-index="${index}"></div>`
        );
      }
    });

    return (
      <div>
        <div dangerouslySetInnerHTML={{ __html: content }} />
        {/* 这里需要在实际实现中处理内联图片的插入 */}
        <InlineImageRenderer images={detectedImages} />
      </div>
    );
  }
}
