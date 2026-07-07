import React, { useState } from 'react';
import { LogOut, Plus, X, Home, Folder, BarChart3, Settings, HelpCircle } from 'lucide-react';
import { useChat } from '../store/ChatContext';
import ConversationItem from './ConversationItem';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { conversations, createConversation, user, logout } = useChat();
  const [activeTab, setActiveTab] = useState<'home' | 'projects' | 'analytics' | 'settings'>('home');

  const handleNewChat = async () => {
    await createConversation("New Chat");
    onClose(); // close drawer on mobile if open
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'projects', label: 'Projects', icon: Folder },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

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
        className={`fixed lg:static top-0 left-0 z-50 h-full w-72 flex flex-col bg-zinc-950 border-r border-zinc-900 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header section (Nexa AI logo with glow + Title) */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-900">
          <div className="flex items-center space-x-3">
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)] text-white border border-white/10">
              <span className="text-base font-extrabold font-sans">N</span>
            </div>
            <span className="font-extrabold text-lg text-white tracking-tight">Nexa AI</span>
          </div>
          {/* Close button for mobile drawer */}
          <button
            onClick={onClose}
            className="lg:hidden text-zinc-400 hover:text-zinc-200 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button: New Chat (Light Blue Style) */}
        <div className="px-4 pt-5 pb-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 font-semibold text-sm transition-all focus:outline-none"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Premium Linear/Vercel Style Navigation Menu */}
        <nav className="px-3 space-y-1 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all focus:outline-none ${
                  isActive
                    ? 'bg-zinc-900 text-white border-l-2 border-blue-500 shadow-inner'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-zinc-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Conversation List / History */}
        <div className="flex-grow overflow-y-auto px-3 border-t border-zinc-900/50 mt-2 pt-2">
          <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Recent Conversations
          </div>
          <div className="space-y-1 mt-1">
            {conversations.length > 0 ? (
              conversations.map((conv) => (
                <ConversationItem key={conv.id} conversation={conv} />
              ))
            ) : (
              <div className="text-center py-6 text-xs text-zinc-600 font-medium">
                No conversations
              </div>
            )}
          </div>
        </div>

        {/* Footer Layout: Support + Logout + User Badge */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-950/80 space-y-3">
          {/* Support Link */}
          <button className="w-full flex items-center space-x-3 px-3 py-2.5 text-zinc-400 hover:text-zinc-200 transition-colors text-sm font-medium focus:outline-none">
            <HelpCircle className="w-4.5 h-4.5 text-zinc-500" />
            <span>Support</span>
          </button>

          {/* Logout Trigger */}
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-3 py-2.5 text-zinc-400 hover:text-red-400 transition-colors text-sm font-medium focus:outline-none"
          >
            <LogOut className="w-4.5 h-4.5 text-zinc-500" />
            <span>Logout</span>
          </button>

          {/* User Profile Badge (Vercel Style Card) */}
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-zinc-900/40 border border-zinc-900/80 mt-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm flex-shrink-0 border border-white/10 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-grow">
              <p className="text-xs font-bold text-zinc-100 truncate">{user?.name || 'Alex Rivera'}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Pro Member
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
