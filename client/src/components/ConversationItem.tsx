import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Trash2, Edit2, Check, X, MoreVertical, Pin, PinOff, Archive, RefreshCw } from 'lucide-react';
import type { Conversation } from '../types';
import { useChat } from '../store/ChatContext';
import { motion, AnimatePresence } from 'framer-motion';

interface ConversationItemProps {
  conversation: Conversation;
}

const ConversationItem: React.FC<ConversationItemProps> = ({ conversation }) => {
  const { 
    activeConversationId, 
    selectConversation, 
    renameConversation, 
    deleteConversation, 
    pinConversation, 
    searchQuery,
    archiveConversation,
    restoreConversation
  } = useChat();
  const isActive = activeConversationId === conversation.id;

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) {
      return <>{text}</>;
    }
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapeRegExp(highlight)})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-500/30 text-yellow-100 rounded-sm px-0.5 font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const [isEditing, setIsEditing] = useState(false);
  const [titleInput, setTitleInput] = useState(conversation.title);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleSelect = () => {
    if (!isEditing && !isDeleting && !showMenu) {
      selectConversation(conversation.id);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;
    const success = await renameConversation(conversation.id, titleInput.trim());
    if (success) {
      setIsEditing(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowConfirmDelete(true);
  };

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      onClick={handleSelect}
      className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
        isActive
          ? 'bg-zinc-900 text-white font-medium border-l-2 border-indigo-500 shadow-inner'
          : 'text-zinc-400 hover:bg-zinc-900/20 hover:text-zinc-200'
      }`}
    >
      <div className="flex items-center space-x-2.5 min-w-0 flex-grow">
        <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-zinc-500'}`} />

        {isEditing ? (
          <form onSubmit={handleRename} onClick={(e) => e.stopPropagation()} className="flex items-center space-x-1 flex-grow mr-6">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full bg-zinc-800 text-xs px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
              autoFocus
            />
            <button type="submit" className="text-emerald-500 hover:text-emerald-600 p-0.5">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setTitleInput(conversation.title);
              }}
              className="text-red-500 hover:text-red-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <span className="text-xs truncate mr-5">
            {highlightText(conversation.title, searchQuery)}
          </span>
        )}
      </div>

      {/* Pin or Archive icon shown if active and menu is NOT open */}
      {!showMenu && (
        conversation.isArchived ? (
          <Archive className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 mr-1.5" />
        ) : conversation.isPinned ? (
          <Pin className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mr-1.5 group-hover:opacity-0 transition-opacity" />
        ) : null
      )}

      {/* Three-dot dropdown menu trigger and popover */}
      {!isEditing && !isDeleting && (
        <div
          ref={menuRef}
          className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center pl-3 z-10 transition-opacity ${
            showMenu ? 'opacity-100 bg-zinc-950' : 'opacity-0 group-hover:opacity-100 bg-zinc-950/80 group-hover:bg-zinc-950'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-zinc-400 hover:text-zinc-250 p-1 rounded-lg hover:bg-zinc-800 transition-colors focus:outline-none"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-6 w-44 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl py-1.5 z-50 text-left"
              >
                {conversation.isArchived ? (
                  <>
                    {/* Restore option */}
                    <button
                      onClick={async () => {
                        setShowMenu(false);
                        await restoreConversation(conversation.id);
                      }}
                      className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors focus:outline-none font-medium"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Restore Conversation</span>
                    </button>

                    {/* Permanent Delete option */}
                    <button
                      onClick={handleDeleteClick}
                      className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors focus:outline-none font-medium border-t border-zinc-800/60 mt-1 pt-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Permanently</span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Pin / Unpin option */}
                    <button
                      onClick={async () => {
                        setShowMenu(false);
                        await pinConversation(conversation.id, !conversation.isPinned);
                      }}
                      className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors focus:outline-none font-medium"
                    >
                      {conversation.isPinned ? (
                        <>
                          <PinOff className="w-3.5 h-3.5 text-zinc-450" />
                          <span>Unpin Conversation</span>
                        </>
                      ) : (
                        <>
                          <Pin className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Pin Conversation</span>
                        </>
                      )}
                    </button>

                    {/* Archive option */}
                    <button
                      onClick={async () => {
                        setShowMenu(false);
                        await archiveConversation(conversation.id);
                      }}
                      className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors focus:outline-none font-medium"
                    >
                      <Archive className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Archive Conversation</span>
                    </button>

                    {/* Rename option */}
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setIsEditing(true);
                      }}
                      className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors focus:outline-none font-medium"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-zinc-450" />
                      <span>Rename</span>
                    </button>

                    {/* Delete option */}
                    <button
                      onClick={handleDeleteClick}
                      className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors focus:outline-none font-medium border-t border-zinc-800/60 mt-1 pt-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      <AnimatePresence>
        {showConfirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={(e) => {
              e.stopPropagation();
              setShowConfirmDelete(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold text-white mb-2">Delete Conversation?</h3>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                This action is permanent and cannot be undone. All messages in this conversation will be deleted forever.
              </p>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowConfirmDelete(false);
                    setIsDeleting(true);
                    const success = await deleteConversation(conversation.id);
                    if (!success) {
                      setIsDeleting(false);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-650 hover:bg-red-700 text-white transition-colors focus:outline-none"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ConversationItem;
