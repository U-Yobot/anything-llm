const pluralize = require("pluralize");
const {
  WorkspaceAgentInvocation,
} = require("../../models/workspaceAgentInvocation");
const { writeResponseChunk } = require("../helpers/chat/responses");

async function grepAgents ({
  uuid,
  response,
  message,
  workspace,
  user = null,
  thread = null,
}) {
  // 🔍 DEBUG: 输出agent检测过程
  console.log(`\x1b[35m[DEBUG-AGENTS]\x1b[0m grepAgents 开始检测:`, {
    message: message,
    messageType: typeof message,
    startsWithAgent: message?.startsWith?.("@agent"),
    includesAgent: message?.includes?.("@agent"),
  });

  const agentHandles = WorkspaceAgentInvocation.parseAgents(message);

  // 🔍 DEBUG: 输出解析结果
  console.log(`\x1b[35m[DEBUG-AGENTS]\x1b[0m parseAgents 解析结果:`, {
    agentHandles: agentHandles,
    agentHandlesLength: agentHandles.length,
    isAgentChat: agentHandles.length > 0,
  });

  if (agentHandles.length > 0) {
    const { invocation: newInvocation } = await WorkspaceAgentInvocation.new({
      prompt: message,
      workspace: workspace,
      user: user,
      thread: thread,
    });

    if (!newInvocation) {
      writeResponseChunk(response, {
        id: uuid,
        type: "statusResponse",
        textResponse: `${pluralize(
          "Agent",
          agentHandles.length
        )} ${agentHandles.join(
          ", "
        )} could not be called. Chat will be handled as default chat.`,
        sources: [],
        close: true,
        animate: false,
        error: null,
      });
      return;
    }

    writeResponseChunk(response, {
      id: uuid,
      type: "agentInitWebsocketConnection",
      textResponse: null,
      sources: [],
      close: false,
      error: null,
      websocketUUID: newInvocation.uuid,
    });

    // Close HTTP stream-able chunk response method because we will swap to agents now.
    writeResponseChunk(response, {
      id: uuid,
      type: "statusResponse",
      textResponse: `${pluralize(
        "Agent",
        agentHandles.length
      )} ${agentHandles.join(
        ", "
      )} invoked.\nSwapping over to agent chat. Type /exit to exit agent execution loop early.`,
      sources: [],
      close: true,
      error: null,
      animate: true,
    });
    return true;
  }

  return false;
}

module.exports = { grepAgents };
