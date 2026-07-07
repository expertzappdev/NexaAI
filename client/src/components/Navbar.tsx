import React from 'react';
import { Menu, Bell, Clock } from 'lucide-react';
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
      <div className="flex items-center space-x-3 min-w-0">
        {/* Mobile Menu Icon */}
        <button
          onClick={onMenuClick}
          className="lg:hidden text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-900 focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        {title && (
          <span className="text-sm font-semibold text-zinc-200 truncate">{title}</span>
        )}
      </div>

      {/* Top Right Minimal Notification and History Icons */}
      <div className="flex items-center space-x-3.5">
        <button className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-900/40 transition-colors focus:outline-none">
          <Bell className="w-4.5 h-4.5" />
        </button>
        <button className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-900/40 transition-colors focus:outline-none">
          <Clock className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
