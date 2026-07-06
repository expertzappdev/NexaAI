import React from 'react';
import { Menu, Sparkles } from 'lucide-react';
import { useChat } from '../store/ChatContext';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { conversations, activeConversationId } = useChat();

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const title = activeConv ? activeConv.title : 'New Chat';

  return (
    <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-zinc-950/95 border-b border-gray-200 dark:border-zinc-900 sticky top-0 z-30 backdrop-blur-md">
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-gray-150 dark:hover:bg-zinc-900 focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        <span className="text-sm font-semibold text-gray-800 dark:text-zinc-200 truncate">{title}</span>
      </div>

      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
