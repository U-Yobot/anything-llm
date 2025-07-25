import { useState } from "react";
import { Question, X } from "@phosphor-icons/react";

export default function FloatingFAQButton({ functions = [], onQuestionClick }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (functions.length === 0) return null;

  const handleQuestionClick = (question) => {
    onQuestionClick(question);
    setIsExpanded(false); // 选择问题后自动收起
  };

  return (
    <>
      {/* 浮动按钮 */}
      <div className="fixed z-50 bottom-24 right-6">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center w-12 h-12 text-white transition-all duration-200 bg-blue-500 rounded-full shadow-lg hover:bg-blue-600 hover:scale-105"
          title="快速问题"
        >
          {isExpanded ? (
            <X className="w-6 h-6" />
          ) : (
            <Question className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* 展开的FAQ面板 */}
      {isExpanded && (
        <div className="fixed z-40 overflow-y-auto border rounded-lg shadow-xl bottom-40 right-6 w-80 max-h-96 bg-theme-bg-secondary border-theme-modal-border">
          <div className="p-4">
            <h3 className="mb-4 text-sm font-medium text-theme-text-primary">
              💡 快速问题
            </h3>

            <div className="space-y-3">
              {functions.map((func) => (
                <div key={func.id} className="p-3 border rounded-lg bg-theme-bg-primary border-theme-modal-border">
                  {/* 功能分类标题 */}
                  <div className="flex items-center mb-2">
                    <h4 className="text-sm font-medium text-theme-text-primary">
                      {func.name}
                    </h4>
                  </div>
                  <p className="mb-3 text-xs text-theme-text-secondary">
                    {func.description}
                  </p>

                  {/* 可点击的问题列表 */}
                  <div className="space-y-1">
                    {func.questions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuestionClick(question)}
                        className="w-full p-2 text-xs text-left transition-all duration-200 border border-transparent rounded text-theme-text-primary hover:bg-blue-50 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm"
                      >
                        <span className="mr-2 text-blue-500">•</span>
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 背景遮罩 - 点击关闭面板 */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-20"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
}
