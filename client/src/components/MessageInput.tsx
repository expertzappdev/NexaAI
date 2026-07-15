import React, { useRef, useState, useEffect } from 'react';
import { ArrowUp, Paperclip } from 'lucide-react';
import { useChat } from '../store/ChatContext';
import ModelSelector from './ModelSelector';

const MessageInput: React.FC = () => {
  const { sendMessage, stopGenerating, isLoading } = useChat();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea based on text length
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [text]);

  // Keep focus on the textarea when loading finishes
  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const handleStop = async () => {
    await stopGenerating();
    // Force focus back immediately after stopping
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleSend = async () => {
    if (!text.trim() || isLoading) return;
    const currentText = text;
    setText('');
    
    // Reset height and keep focus
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }

    await sendMessage(currentText);
    
    // Force focus back immediately after sending
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent px-4 pb-6 pt-2">
      {/* Mobile Model Selector (visible only on screens smaller than sm) */}
      <div className="max-w-2xl mx-auto mb-2 flex justify-start sm:hidden">
        <ModelSelector />
      </div>

      <div className="max-w-2xl mx-auto relative flex items-end border border-zinc-800 bg-zinc-900/60 backdrop-blur-md rounded-3xl shadow-2xl focus-within:ring-1 focus-within:ring-purple-500/40 focus-within:border-purple-500/40 transition-all p-2 pr-3 pl-3.5">
        
        {/* Attachment icon placeholder */}
        <button 
          type="button" 
          className="text-zinc-500 hover:text-zinc-350 p-2 mb-0.5 rounded-full hover:bg-zinc-800/40 transition-colors focus:outline-none"
        >
          <Paperclip className="w-4.5 h-4.5" />
        </button>

        {/* Text area */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Nexa AI..."
          className="flex-grow resize-none border-0 bg-transparent text-sm text-zinc-150 placeholder-zinc-550 focus:ring-0 focus:outline-none px-3.5 py-2.5 max-h-[180px] min-h-[44px] overflow-y-auto leading-relaxed"
        />

        {/* Desktop Model Selector (visible on sm and larger screens) */}
        <div className="hidden sm:flex items-center mr-2 mb-0.5">
          <ModelSelector />
        </div>

        {/* Send / Stop Generating Button */}
        {isLoading ? (
          <button
            type="button"
            onClick={handleStop}
            className="flex items-center justify-center w-9.5 h-9.5 rounded-full mb-0.5 transition-all focus:outline-none bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.35)] hover:scale-105"
            title="Stop Generating"
          >
            {/* Square Stop Icon */}
            <div className="w-3 h-3 bg-zinc-100 rounded-sm"></div>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className={`flex items-center justify-center w-9.5 h-9.5 rounded-full mb-0.5 transition-all focus:outline-none ${
              text.trim()
                ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.35)] hover:brightness-110 hover:scale-105'
                : 'bg-zinc-800 text-zinc-650 cursor-not-allowed'
            }`}
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}
      </div>
      <p className="text-[10px] text-center text-zinc-600 mt-2 font-medium">
        Nexa AI may display inaccurate info. Verify credentials and responses.
      </p>
    </div>
  );
};

export default MessageInput;
