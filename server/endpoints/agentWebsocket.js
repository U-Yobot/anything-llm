const { Telemetry } = require("../models/telemetry");
const {
  WorkspaceAgentInvocation,
} = require("../models/workspaceAgentInvocation");
const { AgentHandler } = require("../utils/agents");
const {
  WEBSOCKET_BAIL_COMMANDS,
} = require("../utils/agents/aibitat/plugins/websocket");
const { safeJsonParse } = require("../utils/http");

// Setup listener for incoming messages to relay to socket so it can be handled by agent plugin.
function relayToSocket (message) {
  if (this.handleFeedback) return this?.handleFeedback?.(message);
  this.checkBailCommand(message);
}

function agentWebsocket (app) {
  if (!app) return;

  app.ws("/agent-invocation/:uuid", async function (socket, request) {
    const invocationUUID = String(request.params.uuid);
    const totalTimer = `[AGENT-PERF] Total Execution Time for ${invocationUUID}`;
    console.time(totalTimer);
    try {
      const initTimer = `[AGENT-PERF] AgentHandler Init Time for ${invocationUUID}`;
      console.time(initTimer);
      const agentHandler = await new AgentHandler({
        uuid: invocationUUID,
      }).init();
      console.timeEnd(initTimer);

      if (!agentHandler.invocation) {
        socket.close();
        return;
      }

      socket.on("message", relayToSocket);
      socket.on("close", () => {
        agentHandler.closeAlert();
        WorkspaceAgentInvocation.close(invocationUUID);
        console.timeEnd(totalTimer);
        return;
      });

      socket.checkBailCommand = (data) => {
        const content = safeJsonParse(data)?.feedback;
        if (WEBSOCKET_BAIL_COMMANDS.includes(content)) {
          agentHandler.log(
            `User invoked bail command while processing. Closing session now.`
          );
          agentHandler.aibitat.abort();
          socket.close();
          return;
        }
      };

      await Telemetry.sendTelemetry("agent_chat_started");
      const setupTimer = `[AGENT-PERF] AIbitat Setup Time for ${invocationUUID}`;
      console.time(setupTimer);
      await agentHandler.createAIbitat({ socket });
      console.timeEnd(setupTimer);
      await agentHandler.startAgentCluster();
    } catch (e) {
      console.error(e.message, e);
      socket?.send(JSON.stringify({ type: "wssFailure", content: e.message }));
      socket?.close();
      console.timeEnd(totalTimer);
    }
  });
}

module.exports = { agentWebsocket };
