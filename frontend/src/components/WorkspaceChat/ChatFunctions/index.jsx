import { useState, useEffect } from "react";
import Workspace from "@/models/workspace";

export default function ChatFunctions({ workspace, onQuestionClick }) {
  const [functions, setFunctions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFunctions() {
      if (!workspace?.slug) return;

      const chatFunctions = await Workspace.getChatFunctions(workspace.slug);
      setFunctions(chatFunctions);
      setLoading(false);
    }

    fetchFunctions();
  }, [workspace?.slug]);

  if (loading || functions.length === 0) return null;

  return (
    <div className="p-4 mb-4 rounded-lg bg-theme-bg-secondary">
      <div className="space-y-4">
        {functions.map((func) => (
          <div
            key={func.id}
            className="p-3 border rounded-lg bg-theme-bg-primary border-theme-modal-border"
          >
            {/* 功能分类标题 */}
            <div className="flex items-center mb-3">
              <h4 className="text-sm font-medium text-theme-text-primary">
                {func.name}
              </h4>
            </div>
            <p className="mb-3 text-xs text-theme-text-secondary">
              {func.description}
            </p>

            {/* 可点击的问题列表 */}
            <div className="space-y-2">
              {func.questions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => onQuestionClick(question)}
                  className="w-full p-2 text-sm text-left transition-all duration-200 border border-transparent rounded text-theme-text-primary hover:bg-blue-50 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm"
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
  );
}
