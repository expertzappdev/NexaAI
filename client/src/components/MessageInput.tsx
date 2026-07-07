import React, { useRef, useState, useEffect } from 'react';
import { ArrowUp, Paperclip } from 'lucide-react';
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
    <div className="bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent px-4 pb-6 pt-2">
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
          disabled={isLoading}
          className="flex-grow resize-none border-0 bg-transparent text-sm text-zinc-150 placeholder-zinc-550 focus:ring-0 focus:outline-none px-3.5 py-2.5 max-h-[180px] min-h-[44px] overflow-y-auto leading-relaxed"
        />

        {/* Circular Send Button with gradient */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
          className={`flex items-center justify-center w-9.5 h-9.5 rounded-full mb-0.5 transition-all focus:outline-none ${
            text.trim() && !isLoading
              ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.35)] hover:brightness-110'
              : 'bg-zinc-800 text-zinc-650 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <ArrowUp className="w-5 h-5" />
          )}
        </button>
      </div>
      <p className="text-[10px] text-center text-zinc-600 mt-2 font-medium">
        Nexa AI may display inaccurate info. Verify credentials and responses.
      </p>
    </div>
  );
};

export default MessageInput;
