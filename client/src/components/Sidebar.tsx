import React, { useState } from 'react';
import { LogOut, Plus, Search, Sparkles, Sun, Moon, X } from 'lucide-react';
import { useChat } from '../store/ChatContext';
import ConversationItem from './ConversationItem';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { conversations, clearMessages, user, logout, theme, toggleTheme } = useChat();
  const [searchQuery, setSearchQuery] = useState('');

  const handleNewChat = () => {
    clearMessages();
    onClose(); // close drawer on mobile if open
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:static top-0 left-0 z-50 h-full w-72 flex flex-col bg-zinc-50 dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-900 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header section */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-zinc-900">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center shadow-md text-white">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <span className="font-bold text-base text-gray-800 dark:text-zinc-150 tracking-tight">AI Chatbot</span>
          </div>
          {/* Close button for mobile drawer */}
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button: New Chat */}
        <div className="px-4 pt-4">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-sm shadow-indigo-600/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 py-3 relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>

        {/* Conversation list area */}
        <div className="flex-grow overflow-y-auto px-2 space-y-1 py-2">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => (
              <ConversationItem key={conv.id} conversation={conv} />
            ))
          ) : (
            <div className="text-center py-8 text-xs text-gray-400 dark:text-zinc-600">
              {searchQuery ? 'No matching conversations' : 'No chat history'}
            </div>
          )}
        </div>

        {/* Footer (Profile + theme + logout) */}
        <div className="p-4 border-t border-gray-200 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-700 dark:text-zinc-200 truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex-grow flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border border-gray-200 dark:border-zinc-850 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors text-gray-500 dark:text-zinc-400 text-xs focus:outline-none"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="flex items-center justify-center p-2.5 rounded-xl border border-gray-200 dark:border-zinc-850 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 transition-colors focus:outline-none"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
