import React, { useState } from "react";
import { Download, Eye, X, CaretLeft, CaretRight } from "@phosphor-icons/react";

export default function ImageGuide({ images = [], title = "操作指南" }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openImageModal = (image, index) => {
    setSelectedImage(image);
    setCurrentIndex(index);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  const navigateImage = (direction) => {
    const newIndex =
      direction === "next"
        ? (currentIndex + 1) % images.length
        : (currentIndex - 1 + images.length) % images.length;

    setCurrentIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  const downloadImage = (imageUrl, filename) => {
    try {
      // 防止重复下载
      if (downloadImage._downloading) return;
      downloadImage._downloading = true;

      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = filename || "image.jpg";
      link.target = "_blank";
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();

      // 清理
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        downloadImage._downloading = false;
      }, 100);
    } catch (error) {
      console.error("下载图片失败:", error);
      downloadImage._downloading = false;
    }
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="p-4 border rounded-lg bg-theme-bg-secondary border-theme-modal-border">
      {/* 标题 */}
      <div className="flex items-center mb-4">
        <div className="flex items-center justify-center w-8 h-8 mr-3 bg-blue-500 rounded-full">
          <Eye className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-theme-text-primary">
          {title}
        </h3>
      </div>

      {/* 图片网格 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {images.map((image, index) => (
          <div
            key={image.id || index}
            className="relative overflow-hidden transition-all duration-200 border rounded-lg cursor-pointer group bg-theme-bg-primary border-theme-modal-border hover:border-blue-400"
          >
            {/* 缩略图 */}
            <div className="relative overflow-hidden aspect-video">
              <img
                src={image.thumbnail}
                alt={image.alt || image.title}
                className="object-cover w-full h-full transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  // 创建一个更清晰的占位图
                  const placeholderSvg = `
                    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
                      <rect width="100%" height="100%" fill="#f8fafc"/>
                      <rect x="50" y="50" width="300" height="200" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="5,5"/>
                      <circle cx="200" cy="120" r="30" fill="#cbd5e1"/>
                      <path d="M185 110 L215 110 L200 140 Z" fill="#94a3b8"/>
                      <text x="200" y="180" font-family="Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">图片加载失败</text>
                    </svg>
                  `;
                  e.target.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(placeholderSvg)}`;
                  e.target.onerror = null; // 防止无限循环
                }}
              />

              {/* 悬浮操作按钮 */}
              <div className="absolute inset-0 flex items-center justify-center space-x-2 transition-opacity duration-200 opacity-0 bg-black/50 group-hover:opacity-100">
                <button
                  onClick={() => openImageModal(image, index)}
                  className="p-2 transition-colors rounded-full bg-white/20 hover:bg-white/30"
                  title="查看大图"
                >
                  <Eye className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() =>
                    downloadImage(image.fullsize, `${image.title}.jpg`)
                  }
                  className="p-2 transition-colors rounded-full bg-white/20 hover:bg-white/30"
                  title="下载图片"
                >
                  <Download className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* 图片标题 */}
            <div className="p-3">
              <h4 className="text-sm font-medium text-theme-text-primary line-clamp-2">
                {image.title}
              </h4>
            </div>
          </div>
        ))}
      </div>

      {/* 大图模态框 */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4">
            {/* 关闭按钮 */}
            <button
              onClick={closeModal}
              className="absolute z-10 p-2 transition-colors rounded-full top-4 right-4 bg-black/50 hover:bg-black/70"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* 导航按钮 */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => navigateImage("prev")}
                  className="absolute z-10 p-2 transition-colors -translate-y-1/2 rounded-full left-4 top-1/2 bg-black/50 hover:bg-black/70"
                >
                  <CaretLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={() => navigateImage("next")}
                  className="absolute z-10 p-2 transition-colors -translate-y-1/2 rounded-full right-4 top-1/2 bg-black/50 hover:bg-black/70"
                >
                  <CaretRight className="w-6 h-6 text-white" />
                </button>
              </>
            )}

            {/* 大图显示 */}
            <div className="overflow-hidden bg-white rounded-lg">
              <img
                src={selectedImage.fullsize}
                alt={selectedImage.alt || selectedImage.title}
                className="w-full h-auto max-h-[70vh] object-contain"
                onError={(e) => {
                  // 创建一个更大的占位图用于模态框
                  const placeholderSvg = `
                    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
                      <rect width="100%" height="100%" fill="#f8fafc"/>
                      <rect x="100" y="100" width="600" height="400" fill="none" stroke="#e2e8f0" stroke-width="3" stroke-dasharray="10,10"/>
                      <circle cx="400" cy="250" r="50" fill="#cbd5e1"/>
                      <path d="M370 230 L430 230 L400 290 Z" fill="#94a3b8"/>
                      <text x="400" y="350" font-family="Arial, sans-serif" font-size="18" fill="#64748b" text-anchor="middle">图片加载失败</text>
                    </svg>
                  `;
                  e.target.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(placeholderSvg)}`;
                  e.target.onerror = null; // 防止无限循环
                }}
              />

              {/* 图片信息栏 */}
              <div className="flex items-center justify-between p-4 bg-gray-50">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedImage.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {currentIndex + 1} / {images.length}
                  </p>
                </div>
                <button
                  onClick={() =>
                    downloadImage(
                      selectedImage.fullsize,
                      `${selectedImage.title}.jpg`
                    )
                  }
                  className="flex items-center px-4 py-2 space-x-2 text-white transition-colors bg-blue-500 rounded-lg hover:bg-blue-600"
                >
                  <Download className="w-4 h-4" />
                  <span>下载</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
