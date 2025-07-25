import React, { useState, useRef } from "react";
import {
  Play,
  Pause,
  ArrowsOut,
  SpeakerHigh,
  SpeakerX,
  X,
} from "@phosphor-icons/react";

// 内联视频渲染组件
export default function InlineVideoRenderer({ videos = [], className = "" }) {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [playingVideos, setPlayingVideos] = useState(new Set());
  const [mutedVideos, setMutedVideos] = useState(new Set());
  const videoRefs = useRef({});

  console.log(`🎬 [InlineVideoRenderer] 渲染视频组件:`, {
    videosCount: videos.length,
    videos: videos.map((video) => ({
      id: video.id,
      title: video.title,
      src: video.src,
      alt: video.alt,
    })),
    className,
  });

  if (!videos || videos.length === 0) {
    console.log(`❌ [InlineVideoRenderer] 没有视频数据，不渲染`);
    return null;
  }

  console.log(`✅ [InlineVideoRenderer] 准备渲染 ${videos.length} 个视频`);

  const togglePlay = (videoId, event) => {
    event.stopPropagation();
    const videoElement = videoRefs.current[videoId];
    if (!videoElement) return;

    if (playingVideos.has(videoId)) {
      videoElement.pause();
      setPlayingVideos((prev) => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
    } else {
      videoElement.play();
      setPlayingVideos((prev) => new Set(prev).add(videoId));
    }
  };

  const toggleMute = (videoId, event) => {
    event.stopPropagation();
    const videoElement = videoRefs.current[videoId];
    if (!videoElement) return;

    videoElement.muted = !videoElement.muted;
    if (videoElement.muted) {
      setMutedVideos((prev) => new Set(prev).add(videoId));
    } else {
      setMutedVideos((prev) => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
    }
  };

  const handleVideoEnd = (videoId) => {
    setPlayingVideos((prev) => {
      const newSet = new Set(prev);
      newSet.delete(videoId);
      return newSet;
    });
  };

  return (
    <>
      {/* 内联视频网格 */}
      <div className={`my-4 ${className}`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <div
              key={video.id}
              className="relative overflow-hidden transition-colors border rounded-lg cursor-pointer group bg-theme-bg-secondary border-theme-modal-border hover:border-blue-500"
              onClick={() => setSelectedVideo(video)}
            >
              {/* 视频容器 */}
              <div className="relative overflow-hidden bg-gray-100 aspect-video">
                <video
                  ref={(el) => {
                    if (el) videoRefs.current[video.id] = el;
                  }}
                  src={video.src}
                  className="object-cover w-full h-full"
                  muted={mutedVideos.has(video.id)}
                  onEnded={() => handleVideoEnd(video.id)}
                  onError={(e) => {
                    console.log(`❌ [视频加载失败] ${video.src}`);
                  }}
                  onLoadedData={() => {
                    console.log(`✅ [视频加载成功] ${video.src}`);
                  }}
                />

                {/* 视频控制遮罩 */}
                <div className="absolute inset-0 flex items-center justify-center transition-all bg-black bg-opacity-0 group-hover:bg-opacity-30">
                  <div className="flex items-center gap-2 transition-opacity opacity-0 group-hover:opacity-100">
                    {/* 播放/暂停按钮 */}
                    <button
                      onClick={(e) => togglePlay(video.id, e)}
                      className="flex items-center justify-center w-12 h-12 text-white transition-colors bg-black bg-opacity-50 rounded-full hover:bg-opacity-70"
                    >
                      {playingVideos.has(video.id) ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6" />
                      )}
                    </button>

                    {/* 静音按钮 */}
                    <button
                      onClick={(e) => toggleMute(video.id, e)}
                      className="flex items-center justify-center w-10 h-10 text-white transition-colors bg-black bg-opacity-50 rounded-full hover:bg-opacity-70"
                    >
                      {mutedVideos.has(video.id) ? (
                        <SpeakerX className="w-5 h-5" />
                      ) : (
                        <SpeakerHigh className="w-5 h-5" />
                      )}
                    </button>

                    {/* 全屏按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVideo(video);
                      }}
                      className="flex items-center justify-center w-10 h-10 text-white transition-colors bg-black bg-opacity-50 rounded-full hover:bg-opacity-70"
                    >
                      <ArrowsOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 视频信息 */}
              <div className="p-3">
                <h3 className="text-sm font-medium text-theme-text-primary line-clamp-2">
                  {video.title}
                </h3>
                {video.source && (
                  <p className="mt-1 text-xs text-theme-text-secondary">
                    来源: {video.source.title}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 全屏视频模态框 */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
          <div className="relative w-full h-full max-w-6xl max-h-full p-4">
            {/* 关闭按钮 */}
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute z-10 flex items-center justify-center w-10 h-10 text-white transition-colors bg-black bg-opacity-50 rounded-full top-4 right-4 hover:bg-opacity-70"
            >
              <X className="w-6 h-6" />
            </button>

            {/* 全屏视频 */}
            <video
              src={selectedVideo.src}
              controls
              autoPlay
              className="object-contain w-full h-full rounded-lg"
              onError={(e) => {
                console.log(`❌ [全屏视频加载失败] ${selectedVideo.src}`);
              }}
            />

            {/* 视频标题 */}
            <div className="absolute p-4 text-white bg-black bg-opacity-50 rounded-lg bottom-4 left-4 right-4">
              <h2 className="text-lg font-semibold">{selectedVideo.title}</h2>
              {selectedVideo.alt && (
                <p className="mt-1 text-sm opacity-80">{selectedVideo.alt}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 处理消息内容，将视频引用替换为内联视频组件
export function processMessageWithInlineVideos(message, detectedVideos) {
  if (!detectedVideos || detectedVideos.length === 0) {
    return { processedMessage: message, hasVideos: false };
  }

  let processedMessage = message;

  // 将视频标记替换为占位符文本
  detectedVideos.forEach((video) => {
    const videoPattern = new RegExp(
      `\\[@${video.filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`,
      "gi"
    );
    processedMessage = processedMessage.replace(
      videoPattern,
      `📹 ${video.title}`
    );
  });

  return {
    processedMessage,
    hasVideos: true,
  };
}
