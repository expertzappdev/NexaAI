import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Copy, Check, Brain, ChevronDown, ChevronUp, Star } from 'lucide-react';
import type { Message } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { useChat } from '../store/ChatContext';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast, savedMessages, saveMessage, unsaveMessage } = useChat();

  const isSaved = savedMessages.some((sm) => sm.messageId === message.id);

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (isSaved) {
        await unsaveMessage(message.id);
      } else {
        await saveMessage(message.id);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      showToast('Copied to clipboard', 'success');
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

  const parseMessageContent = (content: string) => {
    // 1. Try to find a closed think tag
    const thinkRegex = /<(think|thought)>([\s\S]*?)<\/\1>/gi;
    const match = thinkRegex.exec(content);
    
    if (match) {
      const thinking = match[2].trim();
      const cleanContent = content.replace(thinkRegex, '').trim();
      return { thinking, cleanContent, isThinkingComplete: true };
    }
    
    // 2. Try to find an unclosed think tag (useful for streaming/incomplete messages)
    const unclosedRegex = /<(think|thought)>([\s\S]*)/i;
    const unclosedMatch = unclosedRegex.exec(content);
    if (unclosedMatch) {
      const thinking = unclosedMatch[2].trim();
      return { thinking, cleanContent: '', isThinkingComplete: false };
    }
    
    return { thinking: null, cleanContent: content, isThinkingComplete: true };
  };

  const { thinking, cleanContent, isThinkingComplete } = parseMessageContent(message.content);

  return (
    <motion.div
      id={`message-${message.id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-start space-x-3.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse space-x-reverse' : 'mr-auto'}`}
    >
      {/* Avatar */}
      <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-white/5 ${
        isUser 
          ? 'bg-zinc-800 text-zinc-350' 
          : 'bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 text-white font-black text-sm shadow-[0_0_12px_rgba(99,102,241,0.25)]'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <span>N</span>}
      </div>

      {/* Bubble Content Area */}
      <div className="flex flex-col space-y-1 min-w-0">
        {/* Name Header */}
        <span className={`text-[10px] font-bold text-zinc-500 uppercase tracking-widest ${isUser ? 'text-right' : 'text-left'}`}>
          {isUser ? 'You' : 'Nexa AI'}
        </span>

        {/* Message bubble itself */}
        <div className={`relative group p-4.5 rounded-2xl shadow-lg border ${
          isUser 
            ? 'bg-gradient-to-tr from-blue-600 to-purple-600 border-indigo-500/25 text-white rounded-tr-none shadow-purple-600/5' 
            : 'bg-zinc-900/40 backdrop-blur-md border-zinc-800/80 text-zinc-150 rounded-tl-none'
        }`}>
          {/* Action Buttons (visible on hover) */}
          {isUser ? (
            <button
              onClick={handleCopy}
              className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-900 transition-all text-zinc-250 hover:text-white focus:outline-none focus:opacity-100"
              title="Copy message"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <div className="absolute top-2.5 right-2.5 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              {/* Save Button */}
              <button
                onClick={handleSaveToggle}
                disabled={isSaving}
                className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-amber-400 transition-all focus:outline-none focus:opacity-100"
                title={isSaved ? "Remove from saved" : "Save response"}
              >
                <Star className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
              
              {/* Copy Button */}
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all focus:outline-none focus:opacity-100"
                title="Copy response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Thinking Block Section */}
          {!isUser && thinking && (
            <div className="mb-3.5 border-b border-zinc-800/80 pb-3">
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none"
              >
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                <span>{showThinking ? 'Hide Thought Process' : 'Show Thought Process'}</span>
                {!isThinkingComplete && (
                  <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/25 px-1.5 py-0.2 rounded animate-pulse">
                    Thinking...
                  </span>
                )}
                {showThinking ? <ChevronUp className="w-3 h-3 text-zinc-500" /> : <ChevronDown className="w-3 h-3 text-zinc-500" />}
              </button>
              
              {showThinking && (
                <div className="mt-2.5 pl-3 border-l border-zinc-700 text-zinc-400 text-xs leading-relaxed whitespace-pre-wrap font-normal italic select-text">
                  {thinking}
                </div>
              )}
            </div>
          )}

          {/* Text Content */}
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            cleanContent && <MarkdownRenderer content={cleanContent} />
          )}

          {/* Bubble Footer (Time and Analytics) */}
          <div className={`flex items-center space-x-2 mt-2 text-[10px] ${
            isUser ? 'justify-end text-zinc-200/85' : 'justify-start text-zinc-500'
          }`}>
            <span>{formatTime(message.createdAt)}</span>
            
            {/* Display Token and Model info for AI assistant response */}
            {!isUser && message.model && (() => {
              const isSearchUsed = message.model.toLowerCase().includes('search') || message.model.toLowerCase().includes('+');
              const displayModel = message.model.replace(/\s*\+\s*Search/i, '').replace(/nexa-web-search/i, 'Nexa Search');
              return (
                <>
                  {isSearchUsed && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-sans text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide uppercase">
                        🌐 Web results used
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span className="font-mono bg-zinc-800/60 border border-zinc-850 px-1 py-0.5 rounded text-[8px] tracking-tight">{displayModel}</span>
                </>
              );
            })()}
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
