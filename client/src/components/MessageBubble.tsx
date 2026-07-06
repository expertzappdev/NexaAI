import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Copy, Check } from 'lucide-react';
import type { Message } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message content: ', err);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-start space-x-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse space-x-reverse' : 'mr-auto'}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
        isUser 
          ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' 
          : 'bg-gradient-to-tr from-indigo-500 to-blue-600 text-white'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble Content Area */}
      <div className="flex flex-col space-y-1">
        {/* Name Header */}
        <span className={`text-[11px] font-semibold text-gray-400 dark:text-gray-500 ${isUser ? 'text-right' : 'text-left'}`}>
          {isUser ? 'You' : 'AI Assistant'}
        </span>

        {/* Message bubble itself */}
        <div className={`relative group p-4 rounded-2xl shadow-sm ${
          isUser 
            ? 'chat-bubble-user rounded-tr-none' 
            : 'chat-bubble-ai rounded-tl-none'
        }`}>
          {/* Copy Button (visible on hover) */}
          <button
            onClick={handleCopy}
            className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-gray-50/80 hover:bg-gray-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 transition-all text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 focus:outline-none focus:opacity-100 ${
              isUser ? 'text-zinc-200 hover:text-white dark:bg-indigo-900/60 dark:hover:bg-indigo-900 bg-indigo-700/60' : ''
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Text Content */}
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}

          {/* Bubble Footer (Time and Analytics) */}
          <div className={`flex items-center space-x-2 mt-2 text-[10px] ${
            isUser ? 'justify-end text-indigo-200/80' : 'justify-start text-gray-400 dark:text-zinc-500'
          }`}>
            <span>{formatTime(message.createdAt)}</span>
            
            {/* Display Token and Model info for AI assistant response */}
            {!isUser && message.model && (
              <>
                <span>•</span>
                <span className="font-mono bg-gray-100 dark:bg-zinc-800/60 px-1 py-0.5 rounded text-[9px]">{message.model}</span>
              </>
            )}
            {!isUser && message.totalTokens && (
              <>
                <span>•</span>
                <span>{message.totalTokens} tokens</span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
