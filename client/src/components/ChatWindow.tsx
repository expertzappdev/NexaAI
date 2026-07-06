import React, { useEffect, useRef } from 'react';
import { useChat } from '../store/ChatContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import EmptyState from './EmptyState';
import TypingIndicator from './TypingIndicator';

const ChatWindow: React.FC = () => {
  const { messages, isLoading } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom on message updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-grow flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
      {/* Scrollable messages or welcome grid */}
      <div className="flex-grow overflow-y-auto px-4 py-6 md:px-6">
        {hasMessages ? (
          <div className="max-w-3xl mx-auto space-y-6 pb-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* AI thinking state */}
            {isLoading && (
              <TypingIndicator />
            )}

            <div ref={bottomRef} />
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Footer Chat Input */}
      <MessageInput />
    </div>
  );
};

export default ChatWindow;
