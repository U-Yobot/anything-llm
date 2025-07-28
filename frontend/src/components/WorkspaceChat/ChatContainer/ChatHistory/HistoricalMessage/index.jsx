import React, { memo } from "react";
import { Info, Warning } from "@phosphor-icons/react";
import UserIcon from "../../../../UserIcon";
import Actions from "./Actions";
import renderMarkdown from "@/utils/chat/markdown";
import { userFromStorage } from "@/utils/request";
import Citations from "../Citation";
import { v4 } from "uuid";
import DOMPurify from "@/utils/chat/purify";
import { EditMessageForm, useEditMessage } from "./Actions/EditMessage";
import { useWatchDeleteMessage } from "./Actions/DeleteMessage";
import TTSMessage from "./Actions/TTSButton";
import {
  THOUGHT_REGEX_CLOSE,
  THOUGHT_REGEX_COMPLETE,
  THOUGHT_REGEX_OPEN,
  ThoughtChainComponent,
} from "../ThoughtContainer";
import paths from "@/utils/paths";
import InlineImageRenderer from "../InlineImageRenderer";
import InlineVideoRenderer from "../InlineVideoRenderer";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { chatQueryRefusalResponse } from "@/utils/chat";

const HistoricalMessage = ({
  uuid = v4(),
  message,
  role,
  workspace,
  sources = [],
  attachments = [],
  error = false,
  feedbackScore = null,
  chatId = null,
  isLastMessage = false,
  regenerateMessage,
  saveEditedMessage,
  forkThread,
  metrics = {},
  alignmentCls = "",
  detectedImages = [], // 新增：检测到的图片信息
}) => {
  const { t } = useTranslation();
  const { isEditing } = useEditMessage({ chatId, role });
  const { isDeleted, completeDelete, onEndAnimation } = useWatchDeleteMessage({
    chatId,
    role,
  });
  const adjustTextArea = (event) => {
    const element = event.target;
    element.style.height = "auto";
    element.style.height = element.scrollHeight + "px";
  };

  const isRefusalMessage =
    role === "assistant" && message === chatQueryRefusalResponse(workspace);

  if (error) {
    return (
      <div
        key={uuid}
        className={`flex justify-center items-end w-full bg-theme-bg-chat`}
      >
        <div className="py-8 px-4 w-full flex gap-x-5 md:max-w-[80%] flex-col">
          <div className={`flex gap-x-5 ${alignmentCls}`}>
            <ProfileImage role={role} workspace={workspace} />
            <div className="p-2 text-red-500 rounded-lg bg-red-50">
              <span className="inline-block">
                <Warning className="inline-block w-4 h-4 mb-1" /> Could not
                respond to message.
              </span>
              <p className="p-2 pl-2 mt-2 font-mono text-xs bg-red-200 border-l-2 border-red-300 rounded-sm">
                {error}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (completeDelete) return null;

  return (
    <div
      key={uuid}
      onAnimationEnd={onEndAnimation}
      className={`${
        isDeleted ? "animate-remove" : ""
      } flex justify-center items-end w-full group bg-theme-bg-chat`}
    >
      <div className="py-8 px-4 w-full flex gap-x-5 md:max-w-[80%] flex-col">
        <div className={`flex gap-x-5 ${alignmentCls}`}>
          <div className="flex flex-col items-center">
            <ProfileImage role={role} workspace={workspace} />
            <div className="mt-1 -mb-10">
              {role === "assistant" && (
                <TTSMessage
                  slug={workspace?.slug}
                  chatId={chatId}
                  message={message}
                />
              )}
            </div>
          </div>
          {isEditing ? (
            <EditMessageForm
              role={role}
              chatId={chatId}
              message={message}
              attachments={attachments}
              adjustTextArea={adjustTextArea}
              saveChanges={saveEditedMessage}
            />
          ) : (
            <div className="break-words">
              <RenderChatContent
                role={role}
                message={message}
                expanded={isLastMessage}
                detectedImages={detectedImages}
              />
              {isRefusalMessage && (
                <Link
                  data-tooltip-id="query-refusal-info"
                  data-tooltip-content={`${t("chat.refusal.tooltip-description")}`}
                  className="!no-underline group !flex w-fit"
                  to={paths.chatModes()}
                  target="_blank"
                >
                  <div className="flex flex-row items-center gap-x-1 group-hover:opacity-100 opacity-60 w-fit">
                    <Info className="text-theme-text-secondary" />
                    <p className="!m-0 !p-0 text-theme-text-secondary !no-underline text-xs cursor-pointer">
                      {t("chat.refusal.tooltip-title")}
                    </p>
                  </div>
                </Link>
              )}
              <ChatAttachments attachments={attachments} />
            </div>
          )}
        </div>
        <div className="flex gap-x-5 ml-14">
          <Actions
            message={message}
            feedbackScore={feedbackScore}
            chatId={chatId}
            slug={workspace?.slug}
            isLastMessage={isLastMessage}
            regenerateMessage={regenerateMessage}
            isEditing={isEditing}
            role={role}
            forkThread={forkThread}
            metrics={metrics}
            alignmentCls={alignmentCls}
          />
        </div>
        {role === "assistant" && <Citations sources={sources} />}
      </div>
    </div>
  );
};

function ProfileImage({ role, workspace }) {
  if (role === "assistant" && workspace.pfpUrl) {
    return (
      <div className="relative w-[35px] h-[35px] rounded-full flex-shrink-0 overflow-hidden">
        <img
          src={workspace.pfpUrl}
          alt="Workspace profile picture"
          className="absolute top-0 left-0 object-cover w-full h-full bg-white rounded-full"
        />
      </div>
    );
  }

  return (
    <UserIcon
      user={{
        uid: role === "user" ? userFromStorage()?.username : workspace.slug,
      }}
      role={role}
    />
  );
}

export default memo(
  HistoricalMessage,
  // Skip re-render the historical message:
  // if the content is the exact same AND (not streaming)
  // the lastMessage status is the same (regen icon)
  // and the chatID matches between renders. (feedback icons)
  (prevProps, nextProps) => {
    return (
      prevProps.message === nextProps.message &&
      prevProps.isLastMessage === nextProps.isLastMessage &&
      prevProps.chatId === nextProps.chatId
    );
  }
);

function ChatAttachments({ attachments = [] }) {
  if (!attachments.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((item) => (
        <img
          key={item.name}
          src={item.contentString}
          className="max-w-[300px] rounded-md"
        />
      ))}
    </div>
  );
}

/**
 * 将文件格式标记转换为用户友好的显示格式
 * @param {string} message - 原始消息
 * @returns {string} - 转换后的消息
 */
function convertFileMarkersToFriendlyFormat(message) {
  if (!message) return message;

  // 转换图片格式：[!filename.jpg] -> filename.jpg
  let convertedMessage = message.replace(
    /\[!([\u4e00-\u9fa5a-zA-Z0-9_.-]+\.(png|jpg|jpeg|gif|bmp|webp|svg|tiff|ico))\]/gi,
    (match, filename) => {
      console.log(`🖼️ [格式转换] 图片标记 "${match}" -> "${filename}"`);
      return `**${filename}**`; // 使用粗体显示文件名
    }
  );

  // 转换视频格式：[@filename.mp4] -> filename.mp4
  convertedMessage = convertedMessage.replace(
    /\[@([\u4e00-\u9fa5a-zA-Z0-9_.-]+\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v|3gp|ogv))\]/gi,
    (match, filename) => {
      console.log(`🎬 [格式转换] 视频标记 "${match}" -> "${filename}"`);
      return `**${filename}**`; // 使用粗体显示文件名
    }
  );

  return convertedMessage;
}

const RenderChatContent = memo(
  ({ role, message, expanded = false, detectedImages = [] }) => {
    // If the message is not from the assistant, we can render it directly
    // as normal since the user cannot think (lol)
    if (role !== "assistant")
      return (
        <span
          className="flex flex-col gap-y-1"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(renderMarkdown(message)),
          }}
        />
      );
    let thoughtChain = null;
    let msgToRender = message;

    // If the message is a perfect thought chain, we can render it directly
    // Complete == open and close tags match perfectly.
    if (message.match(THOUGHT_REGEX_COMPLETE)) {
      thoughtChain = message.match(THOUGHT_REGEX_COMPLETE)?.[0];
      msgToRender = message.replace(THOUGHT_REGEX_COMPLETE, "");
    }

    // If the message is a thought chain but not a complete thought chain (matching opening tags but not closing tags),
    // we can render it as a thought chain if we can at least find a closing tag
    // This can occur when the assistant starts with <thinking> and then <response>'s later.
    if (
      message.match(THOUGHT_REGEX_OPEN) &&
      message.match(THOUGHT_REGEX_CLOSE)
    ) {
      const closingTag = message.match(THOUGHT_REGEX_CLOSE)?.[0];
      const splitMessage = message.split(closingTag);
      thoughtChain = splitMessage[0] + closingTag;
      msgToRender = splitMessage[1];
    }

    // 在渲染前转换文件格式标记为用户友好格式
    const friendlyMessage = convertFileMarkersToFriendlyFormat(msgToRender);

    return (
      <>
        {thoughtChain && (
          <ThoughtChainComponent content={thoughtChain} expanded={expanded} />
        )}
        <span
          className="flex flex-col gap-y-1"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(renderMarkdown(friendlyMessage)),
          }}
        />
        {/* 如果有检测到的媒体文件，在消息末尾显示 */}
        {detectedImages && detectedImages.length > 0 && (
          <>
            {console.log(
              `🎯 [HistoricalMessage] 准备渲染媒体文件:`,
              detectedImages
            )}
            {(() => {
              // 分离图片和视频
              const images = detectedImages.filter(
                (item) => item.type !== "video"
              );
              const videos = detectedImages.filter(
                (item) => item.type === "video"
              );

              console.log(
                `🔍 [HistoricalMessage] 图片数量: ${images.length}, 视频数量: ${videos.length}`
              );

              return (
                <>
                  {images.length > 0 && (
                    <InlineImageRenderer images={images} className="mt-3" />
                  )}
                  {videos.length > 0 && (
                    <InlineVideoRenderer videos={videos} className="mt-3" />
                  )}
                </>
              );
            })()}
          </>
        )}
      </>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.role === nextProps.role &&
      prevProps.message === nextProps.message &&
      prevProps.expanded === nextProps.expanded &&
      JSON.stringify(prevProps.detectedImages) ===
        JSON.stringify(nextProps.detectedImages)
    );
  }
);
