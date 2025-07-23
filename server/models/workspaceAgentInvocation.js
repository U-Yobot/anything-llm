const prisma = require("../utils/prisma");
const { v4: uuidv4 } = require("uuid");

const WorkspaceAgentInvocation = {
  // returns array of strings with their @ handle.
  // must start with @agent for now.
  parseAgents: function (promptString) {
    // 🔍 DEBUG: 输出详细的解析过程
    console.log(`\x1b[36m[DEBUG-PARSE]\x1b[0m parseAgents 详细检测:`, {
      promptString: promptString,
      type: typeof promptString,
      length: promptString?.length,
      startsWithAgent: promptString?.startsWith?.("@agent"),
      firstChar: promptString?.[0],
      firstWord: promptString?.split?.(/\s+/)?.[0],
      trimmedStartsWithAgent: promptString?.trim?.()?.startsWith?.("@agent"),
    });

    if (!promptString.startsWith("@agent")) {
      console.log(`\x1b[36m[DEBUG-PARSE]\x1b[0m 不以@agent开头，返回空数组`);
      return [];
    }

    const result = promptString.split(/\s+/).filter((v) => v.startsWith("@"));
    console.log(`\x1b[36m[DEBUG-PARSE]\x1b[0m 解析结果:`, result);
    return result;
  },

  close: async function (uuid) {
    if (!uuid) return;
    try {
      await prisma.workspace_agent_invocations.update({
        where: { uuid: String(uuid) },
        data: { closed: true },
      });
    } catch { }
  },

  new: async function ({ prompt, workspace, user = null, thread = null }) {
    try {
      const invocation = await prisma.workspace_agent_invocations.create({
        data: {
          uuid: uuidv4(),
          workspace_id: workspace.id,
          prompt: String(prompt),
          user_id: user?.id,
          thread_id: thread?.id,
        },
      });

      return { invocation, message: null };
    } catch (error) {
      console.error(error.message);
      return { invocation: null, message: error.message };
    }
  },

  get: async function (clause = {}) {
    try {
      const invocation = await prisma.workspace_agent_invocations.findFirst({
        where: clause,
      });

      return invocation || null;
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },

  getWithWorkspace: async function (clause = {}) {
    try {
      const invocation = await prisma.workspace_agent_invocations.findFirst({
        where: clause,
        include: {
          workspace: true,
        },
      });

      return invocation || null;
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },

  delete: async function (clause = {}) {
    try {
      await prisma.workspace_agent_invocations.delete({
        where: clause,
      });
      return true;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  },

  where: async function (clause = {}, limit = null, orderBy = null) {
    try {
      const results = await prisma.workspace_agent_invocations.findMany({
        where: clause,
        ...(limit !== null ? { take: limit } : {}),
        ...(orderBy !== null ? { orderBy } : {}),
      });
      return results;
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },
};

module.exports = { WorkspaceAgentInvocation };
