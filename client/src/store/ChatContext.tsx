import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { Conversation, Message, User } from '../types';
import apiClient from '../api/client';
import socketService from '../services/signalrService';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ChatContextType {
  user: User | null;
  token: string | null;
  conversations: Conversation[];
  activeConversationId: number | null;
  messages: Message[];
  isLoading: boolean;
  socketConnected: boolean;
  login: (token: string, user: { id: number; name: string; email: string }) => void;
  logout: () => void;
  loadConversations: () => Promise<void>;
  selectConversation: (id: number) => Promise<void>;
  createConversation: (title: string) => Promise<number | null>;
  renameConversation: (id: number, title: string) => Promise<boolean>;
  deleteConversation: (id: number) => Promise<boolean>;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);

  // Store activeConversationId in a ref to avoid stale closures in socket event handlers
  const activeConversationIdRef = useRef<number | null>(null);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Handle SignalR connection lifecycle and event listeners
  useEffect(() => {
    if (token) {
      socketService.connect(
        token,
        (msg) => {
          // Verify if message belongs to active conversation
          const currentId = activeConversationIdRef.current;
          
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              conversationId: currentId || 0,
              role: msg.role as 'system' | 'user' | 'assistant',
              content: msg.content,
              createdAt: msg.createdAt,
            },
          ]);

          // Touch update time of conversation in list
          if (currentId) {
            setConversations((prev) =>
              prev.map((c) => (c.id === currentId ? { ...c, updatedAt: new Date().toISOString() } : c))
            );
          }
        },
        () => {
          setIsLoading(true);
        },
        () => {
          setIsLoading(false);
        },
        (errorMsg) => {
          showToast(errorMsg, 'error');
          // Append error message to screen
          const currentId = activeConversationIdRef.current;
          if (currentId) {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now() + Math.random(),
                conversationId: currentId,
                role: 'assistant',
                content: `Error: ${errorMsg}`,
                createdAt: new Date().toISOString(),
              },
            ]);
          }
        },
        (connected) => {
          setSocketConnected(connected);
        }
      ).catch((err) => {
        console.error('SignalR init connection failure:', err);
        showToast('SignalR Connection Failed.', 'error');
      });
    } else {
      socketService.disconnect();
      setSocketConnected(false);
    }

    return () => {
      // Disconnect handled explicitly or when token resets to null
    };
  }, [token]);

  // Load initial configurations (token, user)
  useEffect(() => {
    // Keep dark mode permanently
    document.documentElement.classList.add('dark');
    localStorage.setItem('chatbot_theme', 'dark');

    const savedToken = localStorage.getItem('chatbot_token');
    const savedUser = localStorage.getItem('chatbot_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const login = (tokenValue: string, userObj: { id: number; name: string; email: string }) => {
    localStorage.setItem('chatbot_token', tokenValue);
    const mappedUser: User = { 
      id: userObj.id, 
      email: userObj.email, 
      name: userObj.name, 
      createdAt: new Date().toISOString() 
    };
    localStorage.setItem('chatbot_user', JSON.stringify(mappedUser));
    setToken(tokenValue);
    setUser(mappedUser);
    showToast(`Welcome back, ${userObj.name}!`, 'success');
  };

  const logout = () => {
    localStorage.removeItem('chatbot_token');
    localStorage.removeItem('chatbot_user');
    setToken(null);
    setUser(null);
    setConversations([]);
    setActiveConversationId(null);
    setMessages([]);
    showToast('Signed out successfully', 'info');
  };

  const loadConversations = async () => {
    if (!token) return;
    try {
      const response = await apiClient.get<Conversation[]>('/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to load conversations', error);
      showToast('Failed to load conversations from server', 'error');
    }
  };

  const selectConversation = async (id: number) => {
    setActiveConversationId(id);
    setIsLoading(true);
    try {
      const response = await apiClient.get<{ messages: Message[] }>(`/conversations/${id}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch conversation details', error);
      showToast('Could not load chat messages', 'error');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createConversation = async (title: string): Promise<number | null> => {
    try {
      const response = await apiClient.post<Conversation>('/conversations', { title });
      const newConv = response.data;
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setMessages([]);
      return newConv.id;
    } catch (error) {
      console.error('Failed to create conversation', error);
      showToast('Failed to start a new conversation', 'error');
      return null;
    }
  };

  const renameConversation = async (id: number, title: string): Promise<boolean> => {
    try {
      await apiClient.put(`/conversations/${id}`, { title });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title, updatedAt: new Date().toISOString() } : c))
      );
      showToast('Conversation renamed', 'success');
      return true;
    } catch (error) {
      console.error('Failed to rename conversation', error);
      showToast('Could not rename conversation', 'error');
      return false;
    }
  };

  const deleteConversation = async (id: number): Promise<boolean> => {
    try {
      await apiClient.delete(`/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
      showToast('Conversation deleted', 'success');
      return true;
    } catch (error) {
      console.error('Failed to delete conversation', error);
      showToast('Could not delete conversation', 'error');
      return false;
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    let targetConvId = activeConversationId;

    // Create a new conversation if none is active
    if (targetConvId === null) {
      const generatedTitle = text.length > 30 ? text.substring(0, 30) + '...' : text;
      const newId = await createConversation(generatedTitle);
      if (!newId) return;
      targetConvId = newId;
    }

    try {
      await socketService.sendMessage(targetConvId, text);
    } catch (error) {
      console.error('Failed to send message via SignalR', error);
      showToast('Failed to send message. Connecting...', 'error');
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setActiveConversationId(null);
  };

  return (
    <ChatContext.Provider
      value={{
        user,
        token,
        conversations,
        activeConversationId,
        messages,
        isLoading,
        socketConnected,
        login,
        logout,
        loadConversations,
        selectConversation,
        createConversation,
        renameConversation,
        deleteConversation,
        sendMessage,
        clearMessages,
        showToast,
      }}
    >
      {children}

      {/* Floating Toast Notification Center */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start justify-between p-4 rounded-xl border shadow-lg backdrop-blur-md ${
                t.type === 'success'
                  ? 'bg-emerald-50/90 dark:bg-zinc-900/90 border-emerald-250 dark:border-emerald-950/30 text-emerald-800 dark:text-emerald-400'
                  : t.type === 'error'
                  ? 'bg-red-50/90 dark:bg-zinc-900/90 border-red-250 dark:border-red-950/30 text-red-800 dark:text-red-400'
                  : 'bg-zinc-50/90 dark:bg-zinc-900/90 border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-zinc-200'
              }`}
            >
              <div className="flex gap-2.5 items-start">
                {t.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500 mt-0.5" />}
                {t.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />}
                {t.type === 'info' && <Info className="w-5 h-5 flex-shrink-0 text-indigo-500 mt-0.5" />}
                <p className="text-xs font-semibold leading-relaxed">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 p-0.5 ml-3"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
