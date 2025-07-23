const Provider = require("./ai-provider.js");
const InheritMultiple = require("./helpers/classes.js");
const UnTooled = require("./helpers/untooled.js");
const { Ollama } = require("ollama");

/**
 * The agent provider for the Ollama provider.
 */
class OllamaProvider extends InheritMultiple([Provider, UnTooled]) {
  model;

  constructor(config = {}) {
    const {
      // options = {},
      model = null,
    } = config;

    super();
    const headers = process.env.OLLAMA_AUTH_TOKEN
      ? { Authorization: `Bearer ${process.env.OLLAMA_AUTH_TOKEN}` }
      : {};
    this._client = new Ollama({
      host: process.env.OLLAMA_BASE_PATH,
      headers: headers,
    });
    this.model = model;
    this.verbose = true;
  }

  get client () {
    return this._client;
  }

  async #handleFunctionCallChat ({ messages = [] }) {
    // 🔍 DEBUG: 显示发送给 Ollama 的实际消息
    console.log(`\x1b[36m[DEBUG-OLLAMA-AGENT]\x1b[0m 发送给 Ollama 的消息:`, {
      model: this.model,
      messageCount: messages.length,
      host: process.env.OLLAMA_BASE_PATH,
      temperature: 0,
      messages: messages.map((msg, idx) => ({
        index: idx,
        role: msg.role,
        contentLength: msg.content?.length || 0,
        contentPreview:
          msg.content?.substring(0, 300) +
          (msg.content?.length > 300 ? "..." : ""),
      })),
    });

    // 显示完整的系统提示词（通常是第一条消息）
    if (messages.length > 0 && messages[0].role === "system") {
      console.log(`\x1b[36m[DEBUG-OLLAMA-AGENT]\x1b[0m 系统提示词内容:`, {
        fullSystemPrompt: messages[0].content,
      });
    }

    const startTime = Date.now();
    const response = await this.client.chat({
      model: this.model,
      messages,
      options: {
        temperature: 0,
      },
    });
    const endTime = Date.now();

    console.log(`\x1b[36m[DEBUG-OLLAMA-AGENT]\x1b[0m Ollama Agent 响应:`, {
      responseTime: `${endTime - startTime}ms`,
      contentLength: response?.message?.content?.length || 0,
      content: response?.message?.content,
    });

    return response?.message?.content || null;
  }

  /**
   * Create a completion based on the received messages.
   *
   * @param messages A list of messages to send to the API.
   * @param functions
   * @returns The completion.
   */
  async complete (messages, functions = []) {
    try {
      let completion;
      if (functions.length > 0) {
        const { toolCall, text } = await this.functionCall(
          messages,
          functions,
          this.#handleFunctionCallChat.bind(this)
        );

        if (toolCall !== null) {
          this.providerLog(`Valid tool call found - running ${toolCall.name}.`);
          this.deduplicator.trackRun(toolCall.name, toolCall.arguments);
          return {
            result: null,
            functionCall: {
              name: toolCall.name,
              arguments: toolCall.arguments,
            },
            cost: 0,
          };
        }
        completion = { content: text };
      }

      if (!completion?.content) {
        this.providerLog(
          "Will assume chat completion without tool call inputs."
        );

        // 🔍 DEBUG: 显示普通聊天模式的消息
        const cleanedMessages = this.cleanMsgs(messages);
        console.log(
          `\x1b[36m[DEBUG-OLLAMA-CHAT]\x1b[0m 普通聊天模式发送给 Ollama:`,
          {
            model: this.model,
            messageCount: cleanedMessages.length,
            temperature: 0.5,
            use_mlock: true,
            messages: cleanedMessages.map((msg, idx) => ({
              index: idx,
              role: msg.role,
              contentLength: msg.content?.length || 0,
              contentPreview:
                msg.content?.substring(0, 200) +
                (msg.content?.length > 200 ? "..." : ""),
            })),
          }
        );

        const chatStartTime = Date.now();
        const response = await this.client.chat({
          model: this.model,
          messages: cleanedMessages,
          options: {
            use_mlock: true,
            temperature: 0.5,
          },
        });
        const chatEndTime = Date.now();

        console.log(`\x1b[36m[DEBUG-OLLAMA-CHAT]\x1b[0m 普通聊天模式响应:`, {
          responseTime: `${chatEndTime - chatStartTime}ms`,
          contentLength: response?.message?.content?.length || 0,
          content: response?.message?.content,
        });

        completion = response.message;
      }

      // The UnTooled class inherited Deduplicator is mostly useful to prevent the agent
      // from calling the exact same function over and over in a loop within a single chat exchange
      // _but_ we should enable it to call previously used tools in a new chat interaction.
      this.deduplicator.reset("runs");
      return {
        result: completion.content,
        cost: 0,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get the cost of the completion.
   *
   * @param _usage The completion to get the cost for.
   * @returns The cost of the completion.
   * Stubbed since LMStudio has no cost basis.
   */
  getCost (_usage) {
    return 0;
  }
}

module.exports = OllamaProvider;
