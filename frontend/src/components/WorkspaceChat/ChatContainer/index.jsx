import { useState, useEffect, useContext } from "react";
import ChatHistory from "./ChatHistory";
import { CLEAR_ATTACHMENTS_EVENT, DndUploaderContext } from "./DnDWrapper";
import PromptInput, { PROMPT_INPUT_EVENT } from "./PromptInput";
import Workspace from "@/models/workspace";
import handleChat, { ABORT_STREAM_EVENT } from "@/utils/chat";
import { isMobile } from "react-device-detect";
import { SidebarMobileHeader } from "../../Sidebar";
import { useParams } from "react-router-dom";
import { v4 } from "uuid";
import handleSocketResponse, {
  websocketURI,
  AGENT_SESSION_END,
  AGENT_SESSION_START,
} from "@/utils/chat/agent";
import DnDFileUploaderWrapper from "./DnDWrapper";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { MetricsProvider } from "./ChatHistory/HistoricalMessage/Actions/RenderMetrics";
import { ChatTooltips } from "./ChatTooltips";
import FloatingFAQButton from "../FloatingFAQButton";

export default function ChatContainer({ workspace, knownHistory = [] }) {
  const { threadSlug = null } = useParams();
  const [message, setMessage] = useState("");
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [chatHistory, setChatHistory] = useState(knownHistory);
  const [socketId, setSocketId] = useState(null);
  const [websocket, setWebsocket] = useState(null);
  const [chatFunctions, setChatFunctions] = useState([]);
  const [showSystemFAQ, setShowSystemFAQ] = useState(false);
  const { files, parseAttachments } = useContext(DndUploaderContext);

  // Maintain state of message from whatever is in PromptInput
  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  const { listening, resetTranscript } = useSpeechRecognition({
    clearTranscriptOnListen: true,
  });

  // 获取聊天功能列表
  useEffect(() => {
    async function fetchChatFunctions() {
      if (!workspace?.slug) return;

      const functions = await Workspace.getChatFunctions(workspace.slug);
      setChatFunctions(functions);

      // 如果聊天历史为空且有功能列表，添加系统消息
      if (knownHistory.length === 0 && functions.length > 0) {
        const systemMessage = {
          uuid: `system-faq-${Date.now()}`,
          type: "systemFAQ",
          role: "system",
          content: "我在这里帮助你解答停车问题，请选择下面的问题开始咨询：",
          functions: functions,
          animate: false,
          pending: false,
        };

        // 测试：添加一个图片指南示例（实际使用时应该从后端获取）
        if (process.env.NODE_ENV === "development") {
          const imageGuideExample = {
            uuid: `image-guide-${Date.now()}`,
            type: "imageGuide",
            role: "assistant",
            content: "以下是停车缴费的详细操作步骤：",
            title: "停车缴费操作指南",
            images: [
              {
                id: "parking_step1",
                title: "第一步：扫描二维码",
                thumbnail:
                  "https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=扫描二维码",
                fullsize:
                  "https://via.placeholder.com/1200x900/4F46E5/FFFFFF?text=扫描二维码详细图",
                alt: "扫描停车场二维码",
              },
              {
                id: "parking_step2",
                title: "第二步：输入车牌号",
                thumbnail:
                  "https://via.placeholder.com/400x300/059669/FFFFFF?text=输入车牌",
                fullsize:
                  "https://via.placeholder.com/1200x900/059669/FFFFFF?text=输入车牌详细图",
                alt: "输入车牌号码界面",
              },
              {
                id: "parking_step3",
                title: "第三步：选择支付方式",
                thumbnail:
                  "https://via.placeholder.com/400x300/DC2626/FFFFFF?text=选择支付",
                fullsize:
                  "https://via.placeholder.com/1200x900/DC2626/FFFFFF?text=选择支付详细图",
                alt: "选择支付方式界面",
              },
            ],
            animate: false,
            pending: false,
          };

          // 添加一个模拟的包含图片文件引用的消息
          const mockImageDetectionMessage = {
            uuid: `mock-image-detection-${Date.now()}`,
            role: "assistant",
            content:
              "根据您的问题，我为您找到了详细的操作指南。\n\n首先，请查看操作流程截图.png，它展示了完整的操作步骤。然后参考界面示例.jpg来了解各个功能模块的位置和布局。\n\n如果在操作过程中遇到任何问题，可以参考错误处理指南.jpeg中的解决方案。\n\n这些图片资料将帮助您更好地理解和完成相关操作。",
            sources: [
              {
                title: "步骤1.jpg",
                chunkSource: "file://documents/guides/步骤1.jpg",
                text: "这是第一步的详细截图，展示了具体操作方法。",
              },
              {
                title: "步骤2.png",
                chunkSource: "file://documents/screenshots/步骤2.png",
                text: "第二步的界面示例图片，展示了操作界面。",
              },
              {
                title: "操作流程截图.png",
                chunkSource: "file://documents/guides/操作流程截图.png",
                text: "这是操作流程的详细截图，包含了所有必要的步骤说明。",
              },
            ],
            animate: false,
            pending: false,
          };

          setChatHistory([
            systemMessage,
            imageGuideExample,
            mockImageDetectionMessage,
          ]);
        } else {
          setChatHistory([systemMessage]);
        }
        setShowSystemFAQ(true);
      }
    }

    fetchChatFunctions();
  }, [workspace?.slug, knownHistory.length]);

  // Emit an update to the state of the prompt input without directly
  // passing a prop in so that it does not re-render constantly.
  function setMessageEmit(messageContent = "") {
    setMessage(messageContent);
    window.dispatchEvent(
      new CustomEvent(PROMPT_INPUT_EVENT, { detail: messageContent })
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!message || message === "") return false;

    console.log("message", message);

    // 检查是否是 agent 模式，如果是则自动添加 @agent 前缀
    const chatMode = localStorage.getItem("anythingllm_chat_mode");
    let finalMessage = message;

    if (
      chatMode === "agent" &&
      !message.trim().startsWith("@agent") &&
      !message.trim().startsWith("/")
    ) {
      finalMessage = `@agent ${message}`;
      console.log(`🔍 [CHAT-CONTAINER] Agent模式，添加前缀:`, {
        originalMessage: message,
        finalMessage: finalMessage,
      });
    }

    // 🔍 DEBUG: 输出当前message状态
    console.log(`🔍 [CHAT-CONTAINER] handleSubmit 收到消息:`, {
      message: message,
      finalMessage: finalMessage,
      messageType: typeof finalMessage,
      startsWithAgent: finalMessage.startsWith("@agent"),
    });

    const prevChatHistory = [
      ...chatHistory,
      {
        content: message, // 显示用原始消息
        role: "user",
        attachments: parseAttachments(),
      },
      {
        content: "",
        role: "assistant",
        pending: true,
        userMessage: finalMessage, // 发送用带前缀的消息
        animate: true,
      },
    ];

    if (listening) {
      // Stop the mic if the send button is clicked
      endSTTSession();
    }
    setChatHistory(prevChatHistory);
    setMessageEmit("");
    setLoadingResponse(true);
  };

  function endSTTSession() {
    SpeechRecognition.stopListening();
    resetTranscript();
  }

  const regenerateAssistantMessage = (chatId) => {
    const updatedHistory = chatHistory.slice(0, -1);
    const lastUserMessage = updatedHistory.slice(-1)[0];
    Workspace.deleteChats(workspace.slug, [chatId])
      .then(() =>
        sendCommand(
          lastUserMessage.content,
          true,
          updatedHistory,
          lastUserMessage?.attachments
        )
      )
      .catch((e) => console.error(e));
  };

  /**
   * Send a command to the LLM prompt input.
   * @param {string} command - The command to send to the LLM
   * @param {boolean} submit - Whether the command was submitted (default: false)
   * @param {Object[]} history - The history of the chat
   * @param {Object[]} attachments - The attachments to send to the LLM
   * @returns {boolean} - Whether the command was sent successfully
   */
  const sendCommand = async (
    command,
    submit = false,
    history = [],
    attachments = []
  ) => {
    if (!command || command === "") return false;
    if (!submit) {
      setMessageEmit(command);
      return;
    }

    let prevChatHistory;
    if (history.length > 0) {
      // use pre-determined history chain.
      prevChatHistory = [
        ...history,
        {
          content: "",
          role: "assistant",
          pending: true,
          userMessage: command,
          attachments,
          animate: true,
        },
      ];
    } else {
      prevChatHistory = [
        ...chatHistory,
        {
          content: command,
          role: "user",
          attachments,
        },
        {
          content: "",
          role: "assistant",
          pending: true,
          userMessage: command,
          animate: true,
        },
      ];
    }

    setChatHistory(prevChatHistory);
    setMessageEmit("");
    setLoadingResponse(true);
  };

  useEffect(() => {
    async function fetchReply() {
      const promptMessage =
        chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
      const remHistory = chatHistory.length > 0 ? chatHistory.slice(0, -1) : [];
      var _chatHistory = [...remHistory];

      // Override hook for new messages to now go to agents until the connection closes
      if (websocket) {
        if (!promptMessage || !promptMessage?.userMessage) return false;
        window.dispatchEvent(new CustomEvent(CLEAR_ATTACHMENTS_EVENT));
        websocket.send(
          JSON.stringify({
            type: "awaitingFeedback",
            feedback: promptMessage?.userMessage,
          })
        );
        return;
      }

      if (!promptMessage || !promptMessage?.userMessage) return false;

      // If running and edit or regeneration, this history will already have attachments
      // so no need to parse the current state.
      const attachments = promptMessage?.attachments ?? parseAttachments();
      window.dispatchEvent(new CustomEvent(CLEAR_ATTACHMENTS_EVENT));

      await Workspace.multiplexStream({
        workspaceSlug: workspace.slug,
        threadSlug,
        prompt: promptMessage.userMessage,
        chatHandler: (chatResult) =>
          handleChat(
            chatResult,
            setLoadingResponse,
            setChatHistory,
            remHistory,
            _chatHistory,
            setSocketId
          ),
        attachments,
      });
      return;
    }
    loadingResponse === true && fetchReply();
  }, [loadingResponse, chatHistory, workspace]);

  // TODO: Simplify this WSS stuff
  useEffect(() => {
    function handleWSS() {
      try {
        if (!socketId || !!websocket) return;
        const socket = new WebSocket(
          `${websocketURI()}/api/agent-invocation/${socketId}`
        );

        window.addEventListener(ABORT_STREAM_EVENT, () => {
          window.dispatchEvent(new CustomEvent(AGENT_SESSION_END));
          websocket.close();
        });

        socket.addEventListener("message", (event) => {
          setLoadingResponse(true);
          try {
            handleSocketResponse(event, setChatHistory);
          } catch (e) {
            console.error("Failed to parse data");
            window.dispatchEvent(new CustomEvent(AGENT_SESSION_END));
            socket.close();
          }
          setLoadingResponse(false);
        });

        socket.addEventListener("close", (_event) => {
          window.dispatchEvent(new CustomEvent(AGENT_SESSION_END));
          setChatHistory((prev) => [
            ...prev.filter((msg) => !!msg.content),
            {
              uuid: v4(),
              type: "statusResponse",
              content: "Agent session complete.",
              role: "assistant",
              sources: [],
              closed: true,
              error: null,
              animate: false,
              pending: false,
            },
          ]);
          setLoadingResponse(false);
          setWebsocket(null);
          setSocketId(null);
        });
        setWebsocket(socket);
        window.dispatchEvent(new CustomEvent(AGENT_SESSION_START));
        window.dispatchEvent(new CustomEvent(CLEAR_ATTACHMENTS_EVENT));
      } catch (e) {
        setChatHistory((prev) => [
          ...prev.filter((msg) => !!msg.content),
          {
            uuid: v4(),
            type: "abort",
            content: e.message,
            role: "assistant",
            sources: [],
            closed: true,
            error: e.message,
            animate: false,
            pending: false,
          },
        ]);
        setLoadingResponse(false);
        setWebsocket(null);
        setSocketId(null);
      }
    }
    handleWSS();
  }, [socketId]);

  // 处理问题点击
  const handleQuestionClick = (question) => {
    console.log("🔍 [FAQ] 点击问题:", question);
    console.log("🔍 [FAQ] 当前状态:", {
      showSystemFAQ,
      chatHistoryLength: chatHistory.length,
      chatFunctionsLength: chatFunctions.length,
    });

    // 过滤掉系统FAQ消息，构建干净的聊天历史
    const cleanHistory = chatHistory.filter((msg) => msg.type !== "systemFAQ");
    console.log("🔍 [FAQ] 清理后历史长度:", cleanHistory.length);

    // 构建新的聊天历史，添加用户消息和待处理的助手消息
    const newChatHistory = [
      ...cleanHistory,
      {
        content: question,
        role: "user",
        attachments: [],
      },
      {
        content: "",
        role: "assistant",
        pending: true,
        userMessage: question,
        animate: true,
      },
    ];

    console.log("🔍 [FAQ] 新历史长度:", newChatHistory.length);

    // 更新状态
    setShowSystemFAQ(false);
    setChatHistory(newChatHistory);
    setLoadingResponse(true);

    console.log("🔍 [FAQ] 状态已更新，showSystemFAQ设为false");
  };

  return (
    <div
      style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
      className="transition-all duration-500 relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full h-full overflow-hidden z-[2]"
    >
      {isMobile && <SidebarMobileHeader />}
      <DnDFileUploaderWrapper>
        <MetricsProvider>
          <ChatHistory
            history={chatHistory}
            workspace={workspace}
            sendCommand={sendCommand}
            updateHistory={setChatHistory}
            regenerateAssistantMessage={regenerateAssistantMessage}
            hasAttachments={files.length > 0}
            onQuestionClick={handleQuestionClick}
          />
        </MetricsProvider>
        <PromptInput
          submit={handleSubmit}
          onChange={handleMessageChange}
          isStreaming={loadingResponse}
          sendCommand={sendCommand}
          attachments={files}
        />
      </DnDFileUploaderWrapper>
      <ChatTooltips />
      {/* 浮动FAQ按钮 - 只在有真实聊天内容且不显示系统FAQ时显示 */}
      {(() => {
        const realChatHistory = chatHistory.filter(
          (msg) => msg.type !== "systemFAQ"
        );
        return (
          realChatHistory.length > 0 &&
          !showSystemFAQ &&
          chatFunctions.length > 0
        );
      })() && (
        <FloatingFAQButton
          functions={chatFunctions}
          onQuestionClick={handleQuestionClick}
        />
      )}
    </div>
  );
}
