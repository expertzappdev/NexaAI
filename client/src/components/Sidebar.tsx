import React, { useState } from 'react';
import { LogOut, Plus, X, Pin, Search, Archive, ChevronDown, ChevronRight, Star } from 'lucide-react';
import { useChat } from '../store/ChatContext';
import ConversationItem from './ConversationItem';
import { type SavedMessage } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const {
    conversations,
    createConversation,
    user,
    logout,
    searchQuery,
    setSearchQuery,
    archivedConversations,
    savedMessages,
    selectConversation,
    unsaveMessage,
    setScrollToMessageId
  } = useChat();
  
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [savedExpanded, setSavedExpanded] = useState(false);

  const handleSavedMessageClick = async (conversationId: number, messageId: number) => {
    setScrollToMessageId(messageId);
    await selectConversation(conversationId);
    onClose();
  };

  const handleNewChat = async () => {
    await createConversation("New Chat");
    onClose(); // close drawer on mobile if open
  };

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
        <div className="px-4 pt-5 pb-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 font-semibold text-sm transition-all focus:outline-none"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-9 py-2 text-xs rounded-xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 text-zinc-200 placeholder-zinc-500 transition-all focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 text-zinc-400 hover:text-zinc-250 focus:outline-none"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List / History */}
        <div className="flex-grow overflow-y-auto px-3 border-t border-zinc-900/50 mt-2 pt-2 space-y-4">
          {searchQuery && conversations.length === 0 ? (
            <div className="text-center py-12 px-4 text-xs text-zinc-500 font-medium">
              <Search className="w-8 h-8 text-zinc-650 mx-auto mb-2 opacity-50" />
              <p>No conversations found</p>
            </div>
          ) : (
            <>
              {/* Pinned section */}
              {conversations.filter(c => c.isPinned).length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Pin className="w-3 h-3 text-indigo-400" />
                    <span>Pinned Conversations</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {conversations.filter(c => c.isPinned).map((conv) => (
                      <ConversationItem key={conv.id} conversation={conv} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent section */}
              <div>
                <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Recent Conversations
                </div>
                <div className="space-y-1 mt-1">
                  {conversations.filter(c => !c.isPinned).length > 0 ? (
                    conversations.filter(c => !c.isPinned).map((conv) => (
                      <ConversationItem key={conv.id} conversation={conv} />
                    ))
                  ) : conversations.filter(c => c.isPinned).length === 0 ? (
                    <div className="text-center py-6 text-xs text-zinc-600 font-medium">
                      No conversations
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Archived Section */}
              {archivedConversations.length > 0 && (
                <div className="border-t border-zinc-900/50 pt-3">
                  <button
                    onClick={() => setArchivedExpanded(!archivedExpanded)}
                    className="w-full px-3 py-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest flex items-center justify-between transition-colors focus:outline-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <Archive className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Archived ({archivedConversations.length})</span>
                    </div>
                    {archivedExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                  </button>

                  {archivedExpanded && (
                    <div className="space-y-1 mt-2">
                      {archivedConversations.map((conv) => (
                        <ConversationItem key={conv.id} conversation={conv} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Saved Responses Section */}
              <div className="border-t border-zinc-900/50 pt-3">
                <button
                  onClick={() => setSavedExpanded(!savedExpanded)}
                  className="w-full px-3 py-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest flex items-center justify-between transition-colors focus:outline-none"
                >
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                    <span>Saved Responses ({savedMessages.length})</span>
                  </div>
                  {savedExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                  )}
                </button>

                {savedExpanded && (
                  <div className="space-y-1.5 mt-2 max-h-60 overflow-y-auto px-1">
                    {savedMessages.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-zinc-650 font-medium italic">
                        No saved responses
                      </div>
                    ) : (
                      savedMessages.map((sm: SavedMessage) => (
                        <div
                          key={sm.id}
                          onClick={() => handleSavedMessageClick(sm.conversationId, sm.messageId)}
                          className="group relative flex flex-col items-start p-2.5 rounded-xl bg-zinc-900/30 hover:bg-zinc-900 border border-zinc-900/40 hover:border-zinc-800/80 cursor-pointer transition-all duration-200"
                        >
                          <div className="flex items-start justify-between w-full">
                            <span className="text-[10px] font-bold text-amber-400/90 truncate max-w-[80%]">
                              {sm.conversationTitle}
                            </span>
                            {/* Unsave Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                unsaveMessage(sm.messageId);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-all focus:opacity-100"
                              title="Remove from saved"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-[11px] text-zinc-400 group-hover:text-zinc-300 line-clamp-2 mt-1 leading-normal w-full break-all">
                            {sm.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Layout: Logout + User Badge */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-950/80 space-y-3">
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
