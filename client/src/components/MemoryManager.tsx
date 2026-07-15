import React, { useState, useEffect } from 'react';
import { Brain, Plus, Trash2, Edit2, Check, X, Loader2 } from 'lucide-react';
import apiClient from '../api/client';

interface UserMemory {
  id: number;
  userId: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const MemoryManager: React.FC = () => {
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for creating new memory
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [creating, setCreating] = useState(false);

  // States for editing memory
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<UserMemory[]>('/memories');
      setMemories(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.ErrorMessage || 'Failed to fetch memories.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      setCreating(true);
      setError(null);
      const res = await apiClient.post<UserMemory>('/memories', {
        title: newTitle.trim(),
        content: newContent.trim(),
      });
      setMemories((prev) => [res.data, ...prev]);
      setNewTitle('');
      setNewContent('');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.ErrorMessage || 'Failed to create memory.');
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (memory: UserMemory) => {
    setEditingId(memory.id);
    setEditTitle(memory.title);
    setEditContent(memory.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
  };

  const handleUpdateMemory = async (id: number) => {
    if (!editTitle.trim() || !editContent.trim()) return;

    try {
      setUpdatingId(id);
      setError(null);
      const res = await apiClient.put<UserMemory>(`/memories/${id}`, {
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? res.data : m))
      );
      handleCancelEdit();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.ErrorMessage || 'Failed to update memory.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteMemory = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this memory?')) return;

    try {
      setError(null);
      await apiClient.delete(`/memories/${id}`);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.ErrorMessage || 'Failed to delete memory.');
    }
  };

  return (
    <div className="flex-grow overflow-y-auto px-6 py-8 bg-[#050505] flex justify-center">
      <div className="w-full max-w-4xl space-y-8">
        
        {/* Header section */}
        <div className="flex items-center space-x-3.5 pb-2 border-b border-zinc-900/60">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)] text-white border border-white/10">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Nexa AI Memory</h1>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">Manage long-term user preferences and settings remembered by Nexa AI.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Add Memory Form */}
        <form onSubmit={handleAddMemory} className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-900 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-400" /> Add New Memory
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Memory Title</label>
              <input
                type="text"
                placeholder="e.g. Preferred Language"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-650 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none transition-all"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Preference Details</label>
              <input
                type="text"
                placeholder="e.g. Remember that I mainly write in Java and prefer Spring Boot."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-650 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none transition-all"
                required
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={creating || !newTitle.trim() || !newContent.trim()}
              className="flex items-center space-x-2 py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs shadow-[0_4px_12px_rgba(37,99,235,0.2)] disabled:cursor-not-allowed transition-all focus:outline-none"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Save Preference</span>
            </button>
          </div>
        </form>

        {/* Memories List */}
        <div className="space-y-4">
          <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest select-none">
            Saved Preferences ({memories.length})
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-zinc-550 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-zinc-550" />
              <span>Loading memories...</span>
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl bg-zinc-900/10 border border-zinc-900/40 text-xs text-zinc-600 italic">
              No saved preferences found. Start adding some above to tailor Nexa AI.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {memories.map((mem) => {
                const isEditing = editingId === mem.id;
                const isUpdating = updatingId === mem.id;

                return (
                  <div
                    key={mem.id}
                    className="p-5 rounded-2xl bg-zinc-900/20 border border-zinc-900/60 hover:border-zinc-800/80 flex items-start justify-between gap-4 transition-all duration-200 shadow-md"
                  >
                    <div className="flex-grow space-y-2 min-w-0">
                      {isEditing ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full max-w-xs px-3 py-1.5 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                          />
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500/50 resize-y"
                          />
                        </div>
                      ) : (
                        <>
                          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{mem.title}</h3>
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed select-text font-normal">{mem.content}</p>
                        </>
                      )}
                      <span className="block text-[9px] text-zinc-600 select-none">
                        Saved {new Date(mem.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleUpdateMemory(mem.id)}
                            disabled={isUpdating}
                            className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 transition-colors"
                            title="Save Changes"
                          >
                            {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={isUpdating}
                            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 text-zinc-400 transition-colors"
                            title="Cancel Edit"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(mem)}
                            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800/80 hover:border-zinc-750 text-zinc-450 hover:text-zinc-200 transition-all"
                            title="Edit Memory"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMemory(mem.id)}
                            className="p-2 rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/25 text-red-500 hover:text-red-400 transition-all"
                            title="Delete Memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default MemoryManager;
