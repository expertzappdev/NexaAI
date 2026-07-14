import React from 'react';
import { Menu } from 'lucide-react';
import { useChat } from '../store/ChatContext';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { conversations, activeConversationId } = useChat();

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const title = activeConv ? activeConv.title : '';

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-zinc-950/40 border-b border-zinc-900/60 sticky top-0 z-30 backdrop-blur-md">
      <div className="flex items-center space-x-3.5 min-w-0">
        {/* Mobile Menu Icon */}
        <button
          onClick={onMenuClick}
          className="lg:hidden text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-900 focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold tracking-wide text-zinc-100">Nexa AI</span>
        </div>

        {title && (
          <span className="text-xs font-medium text-zinc-550 truncate border-l border-zinc-800/80 pl-3.5 max-w-[150px] sm:max-w-[300px]">
            {title}
          </span>
        )}
      </div>

      {/* Top Right Minimal Icons Area (Removed Notifications & History) */}
      <div className="flex items-center space-x-3.5">
      </div>
    </header>
  );
};

export default Navbar;
