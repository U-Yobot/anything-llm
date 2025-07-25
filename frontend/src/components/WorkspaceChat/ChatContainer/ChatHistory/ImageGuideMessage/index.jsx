import React from "react";
import { Robot } from "@phosphor-icons/react";
import ImageGuide from "../ImageGuide";

export default function ImageGuideMessage({
  message,
  images = [],
  title = "操作指南",
}) {
  return (
    <div className="flex items-end justify-center w-full group bg-theme-bg-chat">
      <div className="py-8 px-4 w-full flex gap-x-5 md:max-w-[80%] flex-col">
        <div className="flex gap-x-5">
          {/* AI头像 */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-[35px] h-[35px] bg-blue-500 rounded-full">
              <Robot className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* 消息内容 */}
          <div className="flex flex-col w-full break-words">
            {/* 文字说明 */}
            {message && (
              <div className="p-4 mb-2 border rounded-lg bg-theme-bg-secondary border-theme-modal-border">
                <p className="whitespace-pre-wrap text-theme-text-primary">
                  {message}
                </p>
              </div>
            )}

            {/* 图片指南 */}
            <ImageGuide images={images} title={title} />
          </div>
        </div>
      </div>
    </div>
  );
}
