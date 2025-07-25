import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import HistoricalMessage from "./HistoricalMessage";
import PromptReply from "./PromptReply";
import StatusResponse from "./StatusResponse";
import { useManageWorkspaceModal } from "../../../Modals/ManageWorkspace";
import ManageWorkspace from "../../../Modals/ManageWorkspace";
import { ArrowDown } from "@phosphor-icons/react";
import debounce from "lodash.debounce";
import useUser from "@/hooks/useUser";
import Chartable from "./Chartable";
import Workspace from "@/models/workspace";
import { useParams } from "react-router-dom";
import paths from "@/utils/paths";
import Appearance from "@/models/appearance";
import useTextSize from "@/hooks/useTextSize";
import { v4 } from "uuid";
import { useTranslation } from "react-i18next";
import { useChatMessageAlignment } from "@/hooks/useChatMessageAlignment";
import SystemFAQMessage from "./SystemFAQMessage";
import ImageGuideMessage from "./ImageGuideMessage";

// 图片文件扩展名列表
const IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".webp",
  ".svg",
  ".tiff",
  ".ico",
];

// 检测 LLM 响应内容中是否引用了图片
export function detectImagesInResponse(message = "", sources = []) {
  console.log(`🔍 [图片检测开始] 消息内容:`, message.substring(0, 200) + "...");
  console.log(`🔍 [图片检测开始] Sources数量:`, sources.length);

  const imageFiles = [];

  // 创建图片文件名到source的映射
  const imageSourceMap = new Map();
  sources.forEach((source, index) => {
    const title = source.title || "";
    const chunkSource = source.chunkSource || "";
    const text = source.text || "";

    console.log(`📄 [Source ${index}]`, {
      title,
      chunkSource,
      text: text.substring(0, 100) + "...",
    });

    const hasImageExtension = IMAGE_EXTENSIONS.some(
      (ext) =>
        title.toLowerCase().includes(ext) ||
        chunkSource.toLowerCase().includes(ext) ||
        text.toLowerCase().includes(ext)
    );

    if (hasImageExtension) {
      const fileName =
        title || chunkSource.split("/").pop() || `image_${index + 1}`;
      const cleanFileName = fileName.replace(/\.[^/.]+$/, ""); // 移除扩展名

      console.log(`🖼️ [发现图片文件]`, {
        fileName,
        cleanFileName,
        title,
        chunkSource,
      });

      imageSourceMap.set(cleanFileName.toLowerCase(), {
        source,
        index,
        fileName,
      });
    }
  });

  console.log(
    `🗺️ [图片映射表] 共找到 ${imageSourceMap.size} 个图片文件:`,
    Array.from(imageSourceMap.keys())
  );

  // 检查 LLM 响应中是否明确提到了这些图片文件名
  const mentionedImages = [];
  imageSourceMap.forEach((imageInfo, cleanFileName) => {
    const messageLower = message.toLowerCase();
    const fileNameLower = imageInfo.fileName.toLowerCase();

    console.log(`🔍 [匹配检查] 检查图片: ${imageInfo.fileName}`, {
      cleanFileName,
      fileNameLower,
      messageLower: messageLower.substring(0, 100) + "...",
      includesFileName: messageLower.includes(fileNameLower),
      includesCleanName: messageLower.includes(cleanFileName),
      includesTitle: messageLower.includes(
        imageInfo.source.title?.toLowerCase() || ""
      ),
    });

    // 精确匹配：检查是否提到了完整的文件名或去掉扩展名的文件名
    if (
      messageLower.includes(fileNameLower) || // 完整文件名：如 "操作流程截图.png"
      messageLower.includes(cleanFileName) || // 去掉扩展名：如 "操作流程截图"
      messageLower.includes(imageInfo.source.title?.toLowerCase() || "") // 文档标题
    ) {
      console.log(
        `✅ [图片匹配成功] LLM回复中提到了图片: ${imageInfo.fileName}`
      );
      mentionedImages.push(imageInfo);
    } else {
      console.log(
        `❌ [图片匹配失败] LLM回复中未提到图片: ${imageInfo.fileName}`
      );
    }
  });

  console.log(`📊 [匹配结果] 共匹配到 ${mentionedImages.length} 个图片`);

  // 如果没有从 sources 中找到图片，但消息中包含图片文件名，则创建虚拟图片
  let imagesToShow = mentionedImages;
  if (imagesToShow.length === 0) {
    console.log(`🔍 [备用检测] 在消息中直接查找图片文件名...`);

    // 使用标记格式 [!图片名称] 来精确匹配图片文件名
    // 这种格式可以避免误匹配文本中的其他内容
    const imageRegex =
      /\[!([\u4e00-\u9fa5a-zA-Z0-9_.-]+\.(png|jpg|jpeg|gif|bmp|webp|svg|tiff|ico))\]/gi;
    const foundImages = message.match(imageRegex);

    if (foundImages && foundImages.length > 0) {
      console.log(`🖼️ [直接匹配] 在消息中找到图片文件:`, foundImages);

      // 去重并清理文件名
      const uniqueImages = [...new Set(foundImages)];

      uniqueImages.forEach((fileName, index) => {
        // 从 [!filename] 格式中提取文件名
        const filenameMatch = fileName.match(/\[!(.*?)\]/);
        const extractedFileName = filenameMatch ? filenameMatch[1] : fileName;

        // 移除文件扩展名用于显示
        const cleanFileName = extractedFileName.replace(/\.[^/.]+$/, "");

        console.log(
          `📝 [文件名处理] 原始: "${fileName}" -> 提取: "${extractedFileName}" -> 清理: "${cleanFileName}"`
        );

        imagesToShow.push({
          source: {
            title: cleanFileName,
            chunkSource: `virtual://${extractedFileName}`,
          },
          index: index,
          fileName: extractedFileName,
        });
      });
    }
  }

  imagesToShow.forEach((imageInfo) => {
    // 生成图片URL - 使用免费的高质量风景图
    const imageUrls = [
      "https://picsum.photos/400/300?random=1",
      "https://picsum.photos/400/300?random=2",
      "https://picsum.photos/400/300?random=3",
      "https://picsum.photos/400/300?random=4",
      "https://picsum.photos/400/300?random=5",
    ];

    const fullsizeUrls = [
      "https://picsum.photos/1200/900?random=1",
      "https://picsum.photos/1200/900?random=2",
      "https://picsum.photos/1200/900?random=3",
      "https://picsum.photos/1200/900?random=4",
      "https://picsum.photos/1200/900?random=5",
    ];

    const imageIndex = imageInfo.index % imageUrls.length;
    const cleanFileName = imageInfo.fileName.replace(/\.[^/.]+$/, "");

    console.log(`🖼️ [智能图片检测] LLM提到了图片: ${imageInfo.fileName}`, {
      message: message.substring(0, 100) + "...",
      fileName: imageInfo.fileName,
      imageIndex,
      thumbnailUrl: imageUrls[imageIndex],
    });

    imageFiles.push({
      id: `llm_mentioned_image_${imageInfo.index}`,
      title: cleanFileName,
      thumbnail: imageUrls[imageIndex],
      fullsize: fullsizeUrls[imageIndex],
      alt: `相关图片: ${imageInfo.fileName}`,
      source: imageInfo.source,
    });
  });

  // 同时检测视频文件
  console.log(`🎬 [视频检测] 开始在消息中查找视频文件...`);
  const videoRegex =
    /\[@([\u4e00-\u9fa5a-zA-Z0-9_.-]+\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v|3gp|ogv))\]/gi;
  const foundVideos = message.match(videoRegex);

  if (foundVideos && foundVideos.length > 0) {
    console.log(`🎬 [直接匹配] 在消息中找到视频标记:`, foundVideos);

    // 从 [@filename] 格式中提取文件名
    const extractedFilenames = foundVideos.map((match) => {
      const filenameMatch = match.match(/\[@(.*?)\]/);
      return filenameMatch ? filenameMatch[1] : match;
    });

    console.log(`📝 [提取文件名] 提取的视频文件名:`, extractedFilenames);

    // 去重并创建视频对象
    const uniqueVideos = [...new Set(extractedFilenames)];

    uniqueVideos.forEach((fileName, index) => {
      // 移除文件扩展名用于显示
      const cleanFileName = fileName.replace(/\.[^/.]+$/, "");

      console.log(
        `📝 [视频文件处理] 原始: "${fileName}" -> 清理: "${cleanFileName}"`
      );

      // 生成视频URL - 使用public目录下的demo视频或在线示例视频
      const demoVideos = [
        "/video/invoice-used.mp4", // 使用现有的demo视频
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
      ];

      const videoIndex = index % demoVideos.length;
      const videoSrc = demoVideos[videoIndex];

      console.log(`🎬 [智能视频检测] LLM提到了视频: ${fileName}`, {
        message: message.substring(0, 100) + "...",
        fileName: fileName,
        videoIndex,
        videoSrc: videoSrc,
      });

      imageFiles.push({
        id: `llm_mentioned_video_${index}`,
        title: cleanFileName,
        filename: fileName,
        src: videoSrc,
        alt: `相关视频: ${fileName}`,
        type: "video", // 添加类型标识
        source: {
          title: cleanFileName,
          chunkSource: `virtual://${fileName}`,
        },
      });
    });
  }

  console.log(
    `🎯 [detectImagesInResponse] 最终返回图片+视频数量:`,
    imageFiles.length
  );
  console.log(`📋 [detectImagesInResponse] 返回的对象:`, imageFiles);
  return imageFiles;
}

// 检测消息中的视频引用
export function detectVideosInResponse(message, chatId) {
  console.log(`🎬 [detectVideosInResponse] 开始检测视频...`);
  console.log(`📝 [消息内容]`, message.substring(0, 200) + "...");

  const videoFiles = [];

  // 使用标记格式 [@视频文件名] 来精确匹配视频文件名
  const videoRegex =
    /\[@([\u4e00-\u9fa5a-zA-Z0-9_.-]+\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v|3gp|ogv))\]/gi;
  const foundVideos = message.match(videoRegex);

  if (foundVideos && foundVideos.length > 0) {
    console.log(`🎬 [直接匹配] 在消息中找到视频标记:`, foundVideos);

    // 从 [@filename] 格式中提取文件名
    const extractedFilenames = foundVideos.map((match) => {
      const filenameMatch = match.match(/\[@(.*?)\]/);
      return filenameMatch ? filenameMatch[1] : match;
    });

    console.log(`📝 [提取文件名] 提取的视频文件名:`, extractedFilenames);

    // 去重并创建视频对象
    const uniqueVideos = [...new Set(extractedFilenames)];

    uniqueVideos.forEach((fileName, index) => {
      // 移除文件扩展名用于显示
      const cleanFileName = fileName.replace(/\.[^/.]+$/, "");

      console.log(
        `📝 [视频文件处理] 原始: "${fileName}" -> 清理: "${cleanFileName}"`
      );

      // 生成视频URL - 使用public目录下的demo视频或在线示例视频
      const demoVideos = [
        "/video/invoice-used.mp4", // 使用现有的demo视频
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
      ];

      const videoIndex = index % demoVideos.length;
      const videoSrc = demoVideos[videoIndex];

      console.log(`🎬 [智能视频检测] LLM提到了视频: ${fileName}`, {
        message: message.substring(0, 100) + "...",
        fileName: fileName,
        videoIndex,
        videoSrc: videoSrc,
      });

      videoFiles.push({
        id: `llm_mentioned_video_${index}`,
        title: cleanFileName,
        filename: fileName,
        src: videoSrc,
        alt: `相关视频: ${fileName}`,
        source: {
          title: cleanFileName,
          chunkSource: `virtual://${fileName}`,
        },
      });
    });
  }

  console.log(
    `🎯 [detectVideosInResponse] 最终返回视频数量:`,
    videoFiles.length
  );
  console.log(`📋 [detectVideosInResponse] 返回的视频对象:`, videoFiles);
  return videoFiles;
}

export default function ChatHistory({
  history = [],
  workspace,
  sendCommand,
  updateHistory,
  regenerateAssistantMessage,
  hasAttachments = false,
  onQuestionClick,
}) {
  const { t } = useTranslation();
  const lastScrollTopRef = useRef(0);
  const { user } = useUser();
  const { threadSlug = null } = useParams();
  const { showing, showModal, hideModal } = useManageWorkspaceModal();
  const [isAtBottom, setIsAtBottom] = useState(true);
  const chatHistoryRef = useRef(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const isStreaming = history[history.length - 1]?.animate;
  const { showScrollbar } = Appearance.getSettings();
  const { textSizeClass } = useTextSize();
  const { getMessageAlignment } = useChatMessageAlignment();

  useEffect(() => {
    // 使用 setTimeout 确保 DOM 更新完成后再滚动
    const timer = setTimeout(() => {
      if (!isUserScrolling && (isAtBottom || isStreaming)) {
        scrollToBottom(false); // Use instant scroll for auto-scrolling
      }
    }, 10);

    return () => clearTimeout(timer);
  }, [history, isAtBottom, isStreaming, isUserScrolling]);

  // 当历史记录长度变化时，强制滚动到底部（新消息添加时）
  useEffect(() => {
    const timer = setTimeout(() => {
      // 如果用户没有主动向上滚动，就自动滚动到底部
      if (!isUserScrolling || isAtBottom) {
        scrollToBottom(false);
        setIsAtBottom(true);
      }
    }, 50); // 稍微延长时间确保DOM完全更新

    return () => clearTimeout(timer);
  }, [history.length, isUserScrolling, isAtBottom]);

  // 组件挂载时滚动到底部
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom(false);
      setIsAtBottom(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // 使用更宽松的底部检测，允许5像素的误差
    const isBottom = scrollHeight - scrollTop - clientHeight <= 5;

    // Detect if this is a user-initiated scroll
    // 只有当用户明显向上滚动时才认为是用户操作
    if (Math.abs(scrollTop - lastScrollTopRef.current) > 20) {
      setIsUserScrolling(!isBottom);
    }

    setIsAtBottom(isBottom);
    lastScrollTopRef.current = scrollTop;
  };

  const debouncedScroll = debounce(handleScroll, 100);

  useEffect(() => {
    const chatHistoryElement = chatHistoryRef.current;
    if (chatHistoryElement) {
      chatHistoryElement.addEventListener("scroll", debouncedScroll);
      return () =>
        chatHistoryElement.removeEventListener("scroll", debouncedScroll);
    }
  }, []);

  const scrollToBottom = (smooth = false) => {
    if (chatHistoryRef.current) {
      const element = chatHistoryRef.current;
      console.log("🔍 [SCROLL] 滚动到底部:", {
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        scrollTop: element.scrollTop,
        smooth,
      });

      element.scrollTo({
        top: element.scrollHeight,
        // Smooth is on when user clicks the button but disabled during auto scroll
        // We must disable this during auto scroll because it causes issues with
        // detecting when we are at the bottom of the chat.
        ...(smooth ? { behavior: "smooth" } : {}),
      });
    }
  };

  const handleSendSuggestedMessage = (heading, message) => {
    sendCommand(`${heading} ${message}`, true);
  };

  const saveEditedMessage = async ({
    editedMessage,
    chatId,
    role,
    attachments = [],
  }) => {
    if (!editedMessage) return; // Don't save empty edits.

    // if the edit was a user message, we will auto-regenerate the response and delete all
    // messages post modified message
    if (role === "user") {
      // remove all messages after the edited message
      // technically there are two chatIds per-message pair, this will split the first.
      const updatedHistory = history.slice(
        0,
        history.findIndex((msg) => msg.chatId === chatId) + 1
      );

      // update last message in history to edited message
      updatedHistory[updatedHistory.length - 1].content = editedMessage;
      // remove all edited messages after the edited message in backend
      await Workspace.deleteEditedChats(workspace.slug, threadSlug, chatId);
      sendCommand(editedMessage, true, updatedHistory, attachments);
      return;
    }

    // If role is an assistant we simply want to update the comment and save on the backend as an edit.
    if (role === "assistant") {
      const updatedHistory = [...history];
      const targetIdx = history.findIndex(
        (msg) => msg.chatId === chatId && msg.role === role
      );
      if (targetIdx < 0) return;
      updatedHistory[targetIdx].content = editedMessage;
      updateHistory(updatedHistory);
      await Workspace.updateChatResponse(
        workspace.slug,
        threadSlug,
        chatId,
        editedMessage
      );
      return;
    }
  };

  const forkThread = async (chatId) => {
    const newThreadSlug = await Workspace.forkThread(
      workspace.slug,
      threadSlug,
      chatId
    );
    window.location.href = paths.workspace.thread(
      workspace.slug,
      newThreadSlug
    );
  };

  const compiledHistory = useMemo(
    () =>
      buildMessages({
        workspace,
        history,
        regenerateAssistantMessage,
        saveEditedMessage,
        forkThread,
        getMessageAlignment,
        onQuestionClick,
      }),
    [
      workspace,
      history,
      regenerateAssistantMessage,
      saveEditedMessage,
      forkThread,
      onQuestionClick,
    ]
  );
  const lastMessageInfo = useMemo(() => getLastMessageInfo(history), [history]);
  const renderStatusResponse = useCallback(
    (item, index) => {
      const hasSubsequentMessages = index < compiledHistory.length - 1;
      return (
        <StatusResponse
          key={`status-group-${index}`}
          messages={item}
          isThinking={!hasSubsequentMessages && lastMessageInfo.isAnimating}
          showCheckmark={
            hasSubsequentMessages ||
            (!lastMessageInfo.isAnimating && !lastMessageInfo.isStatusResponse)
          }
        />
      );
    },
    [compiledHistory.length, lastMessageInfo]
  );

  if (history.length === 0 && !hasAttachments) {
    return (
      <div className="flex flex-col items-center justify-end w-full h-full md:mt-0 pb-44 md:pb-40">
        <div className="flex flex-col items-center md:items-start md:max-w-[600px] w-full px-4">
          <p className="py-4 text-lg text-white/60 font-base">
            {t("chat_window.welcome")}
          </p>
          {!user || user.role !== "default" ? (
            <p className="flex flex-col items-center w-full text-lg text-white/60 font-base md:flex-row gap-x-1">
              {t("chat_window.get_started")}
              <span
                className="font-medium underline cursor-pointer"
                onClick={showModal}
              >
                {t("chat_window.upload")}
              </span>
              {t("chat_window.or")}{" "}
              <b className="italic font-medium">{t("chat_window.send_chat")}</b>
            </p>
          ) : (
            <p className="flex flex-col items-center w-full text-lg text-white/60 font-base md:flex-row gap-x-1">
              {t("chat_window.get_started_default")}{" "}
              <b className="italic font-medium">{t("chat_window.send_chat")}</b>
            </p>
          )}
          <WorkspaceChatSuggestions
            suggestions={workspace?.suggestedMessages ?? []}
            sendSuggestion={handleSendSuggestedMessage}
          />
        </div>
        {showing && (
          <ManageWorkspace
            hideModal={hideModal}
            providedSlug={workspace.slug}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`markdown text-white/80 light:text-theme-text-primary font-light ${textSizeClass} h-full pb-[120px] pt-6 md:pt-0 md:pb-[120px] md:mx-0 overflow-y-auto flex flex-col justify-start ${showScrollbar ? "show-scrollbar" : "no-scroll"}`}
      id="chat-history"
      ref={chatHistoryRef}
      onScroll={handleScroll}
    >
      {compiledHistory.map((item, index) =>
        Array.isArray(item) ? renderStatusResponse(item, index) : item
      )}
      {showing && (
        <ManageWorkspace hideModal={hideModal} providedSlug={workspace.slug} />
      )}
      {!isAtBottom && (
        <div className="fixed z-50 cursor-pointer bottom-40 right-10 md:right-20 animate-pulse">
          <div className="flex flex-col items-center">
            <div
              className="p-1 border rounded-full border-white/10 bg-white/10 hover:bg-white/20 hover:text-white"
              onClick={() => {
                scrollToBottom(true);
                setIsUserScrolling(false);
              }}
            >
              <ArrowDown weight="bold" className="w-5 h-5 text-white/60" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const getLastMessageInfo = (history) => {
  const lastMessage = history?.[history.length - 1] || {};
  return {
    isAnimating: lastMessage?.animate,
    isStatusResponse: lastMessage?.type === "statusResponse",
  };
};

function WorkspaceChatSuggestions({ suggestions = [], sendSuggestion }) {
  if (suggestions.length === 0) return null;
  return (
    <div className="grid justify-center w-full grid-cols-1 gap-2 mt-10 text-xs md:grid-cols-2 text-theme-text-primary">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          className="text-left p-2.5 rounded-xl bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover border border-theme-border"
          onClick={() => sendSuggestion(suggestion.heading, suggestion.message)}
        >
          <p className="font-semibold">{suggestion.heading}</p>
          <p>{suggestion.message}</p>
        </button>
      ))}
    </div>
  );
}

/**
 * Builds the history of messages for the chat.
 * This is mostly useful for rendering the history in a way that is easy to understand.
 * as well as compensating for agent thinking and other messages that are not part of the history, but
 * are still part of the chat.
 *
 * @param {Object} param0 - The parameters for building the messages.
 * @param {Array} param0.history - The history of messages.
 * @param {Object} param0.workspace - The workspace object.
 * @param {Function} param0.regenerateAssistantMessage - The function to regenerate the assistant message.
 * @param {Function} param0.saveEditedMessage - The function to save the edited message.
 * @param {Function} param0.forkThread - The function to fork the thread.
 * @param {Function} param0.getMessageAlignment - The function to get the alignment of the message (returns class).
 * @returns {Array} The compiled history of messages.
 */
function buildMessages({
  history,
  workspace,
  regenerateAssistantMessage,
  saveEditedMessage,
  forkThread,
  getMessageAlignment,
  onQuestionClick,
}) {
  return history.reduce((acc, props, index) => {
    const isLastBotReply =
      index === history.length - 1 && props.role === "assistant";

    if (props?.type === "statusResponse" && !!props.content) {
      if (acc.length > 0 && Array.isArray(acc[acc.length - 1])) {
        acc[acc.length - 1].push(props);
      } else {
        acc.push([props]);
      }
      return acc;
    }

    if (props?.type === "systemFAQ") {
      acc.push(
        <SystemFAQMessage
          key={props.uuid}
          message={props.content}
          functions={props.functions || []}
          onQuestionClick={onQuestionClick}
        />
      );
      return acc;
    }

    if (props?.type === "imageGuide") {
      acc.push(
        <ImageGuideMessage
          key={props.uuid}
          message={props.content}
          images={props.images || []}
          title={props.title || "操作指南"}
        />
      );
      return acc;
    }

    if (props.type === "rechartVisualize" && !!props.content) {
      acc.push(
        <Chartable key={props.uuid} workspace={workspace} props={props} />
      );
    } else if (isLastBotReply && props.animate) {
      acc.push(
        <PromptReply
          key={props.uuid || v4()}
          uuid={props.uuid}
          reply={props.content}
          pending={props.pending}
          sources={props.sources}
          error={props.error}
          workspace={workspace}
          closed={props.closed}
        />
      );
    } else {
      // 基于 LLM 响应内容智能检测是否需要显示图片
      const detectedImages =
        props.role === "assistant" && props.content
          ? detectImagesInResponse(props.content, props.sources || [])
          : [];

      console.log(`🔍 [消息处理] 检测图片结果:`, {
        role: props.role,
        hasSources: !!props.sources,
        sourcesCount: props.sources?.length || 0,
        detectedImagesCount: detectedImages.length,
        sources: props.sources,
        detectedImages,
      });

      // 不再单独显示图片组件，而是将图片信息传递给 HistoricalMessage 进行内联显示

      acc.push(
        <HistoricalMessage
          key={index}
          message={props.content}
          role={props.role}
          workspace={workspace}
          sources={props.sources}
          feedbackScore={props.feedbackScore}
          chatId={props.chatId}
          error={props.error}
          attachments={props.attachments}
          regenerateMessage={regenerateAssistantMessage}
          isLastMessage={isLastBotReply}
          saveEditedMessage={saveEditedMessage}
          forkThread={forkThread}
          metrics={props.metrics}
          alignmentCls={getMessageAlignment?.(props.role)}
          detectedImages={detectedImages} // 传递检测到的图片信息
        />
      );
    }
    return acc;
  }, []);
}
