import React, { useRef, useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { useChat } from '../store/ChatContext';

const MessageInput: React.FC = () => {
  const { sendMessage, isLoading } = useChat();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea based on text length
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [text]);

  const handleSend = async () => {
    if (!text.trim() || isLoading) return;
    const currentText = text;
    setText('');
    
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await sendMessage(currentText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md px-4 py-4">
      <div className="max-w-3xl mx-auto relative flex items-end border border-gray-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 transition-all p-2 pr-3">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          disabled={isLoading}
          className="flex-grow resize-none border-0 bg-transparent text-sm text-gray-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:ring-0 focus:outline-none px-3 py-2 max-h-[180px] min-h-[36px] overflow-y-auto"
        />

        <button
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
          className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
            text.trim() && !isLoading
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/10'
              : 'bg-gray-100 dark:bg-zinc-800 text-gray-300 dark:text-zinc-600 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <ArrowUp className="w-4 h-4" />
          )}
        </button>
      </div>
      <p className="text-[10px] text-center text-gray-400 dark:text-zinc-600 mt-2">
        AI Chatbot may display inaccurate info. Verify credentials and responses.
      </p>
    </div>
  );
};

export default MessageInput;
