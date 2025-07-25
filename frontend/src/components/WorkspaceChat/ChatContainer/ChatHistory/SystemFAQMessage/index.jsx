import { Robot } from "@phosphor-icons/react";

export default function SystemFAQMessage({
  message,
  functions = [],
  onQuestionClick,
}) {
  if (functions.length === 0) return null;

  return (
    <div className="flex items-end justify-center w-full bg-theme-bg-chat">
      <div className="py-8 px-4 w-full flex gap-x-5 md:max-w-[80%] flex-col">
        <div className="flex gap-x-5">
          {/* 系统头像 */}
          <div className="flex-shrink-0 mt-3 ml-2">
            <div className="flex items-center justify-center w-[35px] h-[35px] rounded-full bg-blue-500">
              <Robot className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* 消息内容 */}
          <div className="flex flex-col w-full">
            <div className="p-4 border rounded-lg bg-theme-bg-secondary border-theme-modal-border">
              {/* 醒目的标题 */}
              <div className="flex items-center pb-3 mb-4 border-b border-theme-modal-border">
                <h2 className="flex items-center text-lg font-semibold text-theme-text-primary">
                  {message}
                </h2>
              </div>
              <div className="space-y-4">
                {functions.map((func) => (
                  <div
                    key={func.id}
                    className="p-4 transition-colors duration-200 border rounded-lg bg-theme-bg-primary border-theme-modal-border hover:border-blue-300"
                  >
                    {/* 功能分类标题 */}
                    <div className="flex items-center mb-3">
                      <h4 className="text-base font-semibold text-theme-text-primary">
                        {func.name}
                      </h4>
                    </div>
                    <p className="mb-4 text-sm text-theme-text-secondary">
                      {func.description}
                    </p>

                    {/* 可点击的问题列表 */}
                    <div className="space-y-2">
                      {func.questions.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => onQuestionClick(question)}
                          className="w-full p-3 text-sm text-left transition-all duration-200 border border-gray-200 dark:border-gray-600 rounded-lg text-theme-text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md hover:scale-[1.02] bg-white/50 dark:bg-gray-800/50"
                        >
                          <span className="mr-3 font-bold text-blue-500">
                            →
                          </span>
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
