import React, { useState } from 'react';
import { MessageSquare, Trash2, Edit2, Check, X } from 'lucide-react';
import type { Conversation } from '../types';
import { useChat } from '../store/ChatContext';

interface ConversationItemProps {
  conversation: Conversation;
}

const ConversationItem: React.FC<ConversationItemProps> = ({ conversation }) => {
  const { activeConversationId, selectConversation, renameConversation, deleteConversation } = useChat();
  const isActive = activeConversationId === conversation.id;

  const [isEditing, setIsEditing] = useState(false);
  const [titleInput, setTitleInput] = useState(conversation.title);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSelect = () => {
    if (!isEditing && !isDeleting) {
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    const success = await deleteConversation(conversation.id);
    if (!success) {
      setIsDeleting(false);
    }
  };

  return (
    <div
      onClick={handleSelect}
      className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
        isActive
          ? 'bg-zinc-150 dark:bg-zinc-800 text-zinc-950 dark:text-white font-medium'
          : 'text-gray-600 dark:text-zinc-400 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/40 hover:text-gray-900 dark:hover:text-zinc-200'
      }`}
    >
      <div className="flex items-center space-x-2.5 min-w-0 flex-grow">
        <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-500' : 'text-gray-400'}`} />

        {isEditing ? (
          <form onSubmit={handleRename} onClick={(e) => e.stopPropagation()} className="flex items-center space-x-1 flex-grow">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full bg-zinc-200 dark:bg-zinc-700 text-xs px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white"
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
          <span className="text-xs truncate">{conversation.title}</span>
        )}
      </div>

      {/* Action buttons (Trash and Edit) shown on hover */}
      {!isEditing && !isDeleting && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-zinc-100 dark:from-zinc-900 via-zinc-100 dark:via-zinc-900 pl-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-850 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ConversationItem;
