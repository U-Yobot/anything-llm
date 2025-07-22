import { useState, useRef } from "react";
import { ChatCircle, Robot } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";

export default function ChatModeSelector() {
  const tooltipRef = useRef(null);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [chatMode, setChatMode] = useState(
    localStorage.getItem("anythingllm_chat_mode") || "chat"
  );

  const toggleTooltip = () => {
    if (!tooltipRef.current) return;
    tooltipRef.current.isOpen
      ? tooltipRef.current.close()
      : tooltipRef.current.open();
  };

  const CurrentModeIcon = chatMode === "agent" ? Robot : ChatCircle;

  return (
    <>
      <div
        id="chat-mode-btn"
        data-tooltip-id="tooltip-chat-mode-btn"
        aria-label={t("chat_window.chat_mode")}
        onClick={toggleTooltip}
        className="flex items-center justify-center border-none cursor-pointer opacity-60 hover:opacity-100 light:opacity-100 light:hover:opacity-60"
      >
        <CurrentModeIcon
          color="var(--theme-sidebar-footer-icon-fill)"
          weight="fill"
          className="w-[22px] h-[22px] pointer-events-none text-white"
        />
      </div>
      <Tooltip
        ref={tooltipRef}
        id="tooltip-chat-mode-btn"
        place="top"
        opacity={1}
        clickable={true}
        delayShow={300}
        delayHide={800}
        arrowColor={
          theme === "light"
            ? "var(--theme-modal-border)"
            : "var(--theme-bg-primary)"
        }
        className="z-99 !w-[140px] !bg-theme-bg-primary !px-[5px] !rounded-lg !pointer-events-auto light:border-2 light:border-theme-modal-border"
      >
        <ChatModeMenu
          tooltipRef={tooltipRef}
          chatMode={chatMode}
          setChatMode={setChatMode}
        />
      </Tooltip>
    </>
  );
}

function ChatModeMenu({ tooltipRef, chatMode, setChatMode }) {
  const { t } = useTranslation();

  const handleModeChange = (mode) => {
    setChatMode(mode);
    localStorage.setItem("anythingllm_chat_mode", mode);
    window.dispatchEvent(new CustomEvent("chatModeChange", { detail: mode }));
    tooltipRef.current?.close();
  };

  return (
    <div className="flex flex-col items-stretch justify-start gap-1 p-2">
      <button
        onClick={(e) => {
          e.preventDefault();
          handleModeChange("chat");
        }}
        className={`border-none w-full hover:cursor-pointer px-2 py-2 rounded-md flex items-center gap-2 group ${
          chatMode === "chat"
            ? "bg-theme-action-menu-item-hover"
            : "hover:bg-theme-action-menu-item-hover"
        }`}
      >
        <ChatCircle
          color="var(--theme-sidebar-footer-icon-fill)"
          weight="fill"
          className="w-[16px] h-[16px]"
        />
        <div className="text-sm text-theme-text-primary">
          {t("chat_window.chat_mode_chat")}
        </div>
      </button>

      <button
        onClick={(e) => {
          e.preventDefault();
          handleModeChange("agent");
        }}
        className={`border-none w-full hover:cursor-pointer px-2 py-2 rounded-md flex items-center gap-2 group ${
          chatMode === "agent"
            ? "bg-theme-action-menu-item-hover"
            : "hover:bg-theme-action-menu-item-hover"
        }`}
      >
        <Robot
          color="var(--theme-sidebar-footer-icon-fill)"
          weight="fill"
          className="w-[16px] h-[16px]"
        />
        <div className="text-sm text-theme-text-primary">
          {t("chat_window.chat_mode_agent")}
        </div>
      </button>
    </div>
  );
}

export function useChatMode() {
  const [chatMode, setChatMode] = useState(
    localStorage.getItem("anythingllm_chat_mode") || "chat"
  );
  return { chatMode, setChatMode };
}
