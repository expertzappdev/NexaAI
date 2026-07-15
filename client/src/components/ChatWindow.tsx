import React, { useEffect, useRef } from 'react';
import { useChat } from '../store/ChatContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import EmptyState from './EmptyState';
import TypingIndicator from './TypingIndicator';

const ChatWindow: React.FC = () => {
  const { messages, isLoading, scrollToMessageId, setScrollToMessageId } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const isNearBottomRef = useRef<boolean>(true);

  // Monitor user scrolling to detect if they scroll up away from the bottom
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const threshold = 150; // pixels
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
    isNearBottomRef.current = nearBottom;
  };

  // Auto scroll to bottom or to a specific message on update
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (scrollToMessageId) {
      const element = document.getElementById(`message-${scrollToMessageId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight the message briefly for a premium feel
        element.classList.add('ring-2', 'ring-amber-500/50', 'bg-amber-500/5', 'rounded-2xl', 'transition-all', 'duration-500');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-amber-500/50', 'bg-amber-500/5');
        }, 2000);
        setScrollToMessageId(null);
      }
      return;
    }

    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];

    if (lastMessage.role === 'user') {
      // Force scroll to bottom when user sends a message
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      isNearBottomRef.current = true;
    } else if (isNearBottomRef.current) {
      // Smooth continuous scroll with throttling to avoid browser jitter
      const now = Date.now();
      if (now - lastScrollTimeRef.current > 100) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        lastScrollTimeRef.current = now;
      }
    }
  }, [messages, isLoading, scrollToMessageId, setScrollToMessageId]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-grow flex flex-col h-full overflow-hidden bg-[#050505]">
      {/* Scrollable messages or welcome grid */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-grow overflow-y-auto px-4 py-6 md:px-6"
      >
        {hasMessages ? (
          <div className="max-w-2xl mx-auto space-y-6 pb-20">
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
