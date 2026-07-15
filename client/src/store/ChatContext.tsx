import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { Conversation, Message, User, SavedMessage } from '../types';
import apiClient from '../api/client';
import socketService from '../services/signalrService';
import { AI_MODELS } from '../models';
import type { AIModel } from '../models';

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
  pinConversation: (id: number, isPinned: boolean) => Promise<boolean>;
  sendMessage: (text: string) => Promise<void>;
  stopGenerating: () => Promise<void>;
  clearMessages: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  availableModels: AIModel[];
  searchStatus: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  archivedConversations: Conversation[];
  loadArchivedConversations: () => Promise<void>;
  archiveConversation: (id: number) => Promise<boolean>;
  restoreConversation: (id: number) => Promise<boolean>;
  regeneratingMessageId: number | null;
  regenerateResponse: (messageId: number) => Promise<void>;
  editingMessageId: number | null;
  setEditingMessageId: (id: number | null) => void;
  editMessage: (messageId: number, content: string) => Promise<void>;
  savedMessages: SavedMessage[];
  saveMessage: (messageId: number) => Promise<boolean>;
  unsaveMessage: (messageId: number) => Promise<boolean>;
  toggleFeedback: (messageId: number, type: 'Like' | 'Dislike') => Promise<boolean>;
  scrollToMessageId: number | null;
  setScrollToMessageId: (id: number | null) => void;
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
  const [selectedModel, setSelectedModel] = useState<string>('llama-3.1-8b-instant');
  const [availableModels, setAvailableModels] = useState<AIModel[]>(AI_MODELS);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [savedMessages, setSavedMessages] = useState<SavedMessage[]>([]);
  const [scrollToMessageId, setScrollToMessageId] = useState<number | null>(null);

  // Store activeConversationId, regeneratingMessageId, and editingMessageId in refs to avoid stale closures in socket event handlers
  const activeConversationIdRef = useRef<number | null>(null);
  const selectedModelRef = useRef<string>(selectedModel);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);
  useEffect(() => {
    selectedModelRef.current = selectedModel;
  }, [selectedModel]);

  // Typing effect refs for smooth streaming
  const chunkQueueRef = useRef<string[]>([]);
  const typingIntervalRef = useRef<any>(null);
  const renderedTextRef = useRef<string>("");
  const streamCompletedRef = useRef<boolean>(false);
  const completionPayloadRef = useRef<any>(null);

  const startTypingEffect = () => {
    if (typingIntervalRef.current) return;

    typingIntervalRef.current = setInterval(() => {
      if (chunkQueueRef.current.length > 0) {
        // Combined queued text
        const fullQueueText = chunkQueueRef.current.join("");
        
        // Take approximately 2-3 words (around 10-14 characters)
        const charsToTake = Math.min(12, fullQueueText.length);
        const textToAppend = fullQueueText.substring(0, charsToTake);
        const remainingText = fullQueueText.substring(charsToTake);
        
        chunkQueueRef.current = remainingText ? [remainingText] : [];
        renderedTextRef.current += textToAppend;

        setMessages((prev) => {
          const lastMsgIndex = prev.map(m => m.role === 'assistant').lastIndexOf(true);
          if (lastMsgIndex !== -1) {
            const updated = [...prev];
            updated[lastMsgIndex] = {
              ...updated[lastMsgIndex],
              content: renderedTextRef.current,
              isStreaming: true,
            };
            return updated;
          }
          return prev;
        });
      } else if (streamCompletedRef.current) {
        // Finished receiving chunks and queue is completely drained
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }

        const payload = completionPayloadRef.current;
        setMessages((prev) => {
          const lastMsgIndex = prev.map(m => m.role === 'assistant').lastIndexOf(true);
          if (lastMsgIndex !== -1) {
            const updated = [...prev];
            const lastMsg = updated[lastMsgIndex];
            updated[lastMsgIndex] = {
              ...lastMsg,
              id: payload?.messageId || lastMsg.id,
              content: payload?.content !== undefined ? payload.content : renderedTextRef.current,
              isStreaming: false,
              model: payload?.model || lastMsg.model,
              totalTokens: payload?.totalTokens || lastMsg.totalTokens
            };
            return updated;
          }
          return prev;
        });

        setIsLoading(false);
        setSearchStatus(null);
      }
    }, 60); // 60ms is right in the 40-80ms range for a natural typing pace
  };

  const regeneratingMessageIdRef = useRef<number | null>(null);
  useEffect(() => {
    regeneratingMessageIdRef.current = regeneratingMessageId;
  }, [regeneratingMessageId]);

  const editingMessageIdRef = useRef<number | null>(null);
  useEffect(() => {
    editingMessageIdRef.current = editingMessageId;
  }, [editingMessageId]);

  // Handle SignalR connection lifecycle and event listeners
  useEffect(() => {
    if (token) {
      socketService.connect(
        token,
        (msg) => {
          const currentId = activeConversationIdRef.current;
          
          if (msg.role === 'user') {
            setMessages((prev) => {
              if (prev.some(m => m.content === msg.content && m.role === 'user' && Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 10000)) {
                return prev;
              }
              return [
                ...prev,
                {
                  id: msg.id || (Date.now() + Math.random()),
                  conversationId: currentId || 0,
                  role: 'user',
                  content: msg.content,
                  createdAt: msg.createdAt
                }
              ];
            });
            return;
          }

          setMessages((prev) => {
            const placeholderExists = prev.some(m => m.id === 999999);
            if (placeholderExists) {
              return prev.map(m => m.id === 999999 ? {
                ...m,
                id: msg.id || (Date.now() + Math.random()),
                role: 'assistant',
                content: msg.content,
                createdAt: msg.createdAt,
                model: msg.model,
                totalTokens: msg.totalTokens,
                isStopped: msg.isStopped,
                isStreaming: false
              } : m);
            }
            return [
              ...prev,
              {
                id: msg.id || (Date.now() + Math.random()),
                conversationId: currentId || 0,
                role: 'assistant',
                content: msg.content,
                createdAt: msg.createdAt,
                model: msg.model,
                totalTokens: msg.totalTokens,
                isStopped: msg.isStopped,
                isStreaming: false
              }
            ];
          });

          setSearchStatus(null);

          // Touch update time of conversation in list
          if (currentId) {
            setConversations((prev) =>
              prev.map((c) => (c.id === currentId ? { ...c, updatedAt: new Date().toISOString() } : c))
            );
          }
        },
        (chunk: string) => {
          const currentId = activeConversationIdRef.current;
          if (!currentId) return;

          // Push token chunk to queue and start typing ticker
          chunkQueueRef.current.push(chunk);
          startTypingEffect();

          // Touch update time of conversation in list
          setConversations((prev) =>
            prev.map((c) => (c.id === currentId ? { ...c, updatedAt: new Date().toISOString() } : c))
          );
        },
        (payload: any) => {
          // Record completion data and flag stream completion
          completionPayloadRef.current = payload;
          streamCompletedRef.current = true;
          startTypingEffect();
        },
        () => {
          setIsLoading(true);
          const currentId = activeConversationIdRef.current;
          const editId = editingMessageIdRef.current;
          const regenId = regeneratingMessageIdRef.current;

          if (regenId !== null) {
            setMessages((prev) => prev.map((m) => m.id === regenId ? { ...m, content: '', isStreaming: true, isStopped: false } : m));
          } else if (editId !== null) {
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === editId);
              if (idx === -1) return prev;
              const truncated = prev.slice(0, idx + 1);
              return [
                ...truncated,
                {
                  id: 999999,
                  conversationId: currentId || 0,
                  role: 'assistant',
                  content: '',
                  createdAt: new Date().toISOString(),
                  isStreaming: true
                }
              ];
            });
          } else if (currentId !== null) {
            setMessages((prev) => {
              if (prev.some(m => m.id === 999999)) return prev;
              return [
                ...prev,
                {
                  id: 999999,
                  conversationId: currentId,
                  role: 'assistant',
                  content: '',
                  createdAt: new Date().toISOString(),
                  isStreaming: true
                }
              ];
            });
          }
        },
        () => {
          setIsLoading(false);
          setSearchStatus(null);
          setRegeneratingMessageId(null);
          setEditingMessageId(null);
          setMessages((prev) => prev.map((m) => m.isStreaming ? { ...m, isStreaming: false } : m));
        },
        (errorMsg) => {
          showToast(errorMsg, 'error');
          setSearchStatus(null);
          setRegeneratingMessageId(null);
          setEditingMessageId(null);
          setMessages((prev) => prev.map((m) => m.isStreaming ? { ...m, isStreaming: false } : m));
          // Append error message to screen if no placeholder exists
          const currentId = activeConversationIdRef.current;
          if (currentId) {
            setMessages((prev) => {
              const placeholderIdx = prev.findIndex(m => m.id === 999999);
              if (placeholderIdx !== -1) {
                return prev.map(m => m.id === 999999 ? {
                  ...m,
                  id: Date.now() + Math.random(),
                  content: `Error: ${errorMsg}`,
                  isStreaming: false
                } : m);
              }
              return [
                ...prev,
                {
                  id: Date.now() + Math.random(),
                  conversationId: currentId,
                  role: 'assistant',
                  content: `Error: ${errorMsg}`,
                  createdAt: new Date().toISOString(),
                },
              ];
            });
          }
          setMessages((prev) => {
            const lastMsgIndex = prev.map(m => m.role === 'assistant').lastIndexOf(true);
            if (lastMsgIndex !== -1) {
              const updated = [...prev];
              const lastMsg = updated[lastMsgIndex];
              updated[lastMsgIndex] = {
                ...lastMsg,
                isStreaming: false,
                content: lastMsg.content || 'Generation interrupted.'
              };
              return updated;
            }
            return prev;
          });
        },
        (connected) => {
          setSocketConnected(connected);
        },
        (status) => {
          setSearchStatus(status);
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.messageId
                ? {
                    ...m,
                    content: payload.content,
                    model: payload.model,
                    totalTokens: payload.totalTokens,
                    isStopped: payload.isStopped,
                    isStreaming: false
                  }
                : m
            )
          );
          setRegeneratingMessageId(null);
        },
        (payload: any) => {
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === payload.editedMessageId);
            if (idx === -1) return prev;
            
            const truncated = prev.slice(0, idx + 1);
            truncated[idx] = {
              ...truncated[idx],
              content: payload.newContent,
              isEdited: true,
              editedAt: payload.editedAt
            };
            
            const assistantResponse = {
              id: payload.assistantResponse.id || (Date.now() + Math.random()),
              conversationId: truncated[idx].conversationId,
              role: 'assistant' as const,
              content: payload.assistantResponse.content,
              createdAt: payload.assistantResponse.createdAt,
              model: payload.assistantResponse.model,
              totalTokens: payload.assistantResponse.totalTokens,
              isStopped: payload.assistantResponse.isStopped,
              isStreaming: false
            };

            return [...truncated, assistantResponse];
          });
          setEditingMessageId(null);
        },
        (chunk: string) => {
          setMessages((prev) => {
            const regenId = regeneratingMessageIdRef.current;
            if (regenId !== null) {
              return prev.map((m) =>
                m.id === regenId ? { ...m, content: m.content + chunk, isStreaming: true } : m
              );
            }
            return prev.map((m) =>
              m.id === 999999 ? { ...m, content: m.content + chunk, isStreaming: true } : m
            );
          });
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
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, [token]);

  // Load available models on token initialization
  useEffect(() => {
    if (token) {
      apiClient.get<any[]>('/models')
        .then((res) => {
          if (res.data && res.data.length > 0) {
            const mapped = res.data.map(serverModel => {
              const local = AI_MODELS.find(m => m.id === serverModel.id || m.id === serverModel.Id);
              return {
                id: serverModel.id || serverModel.Id || '',
                name: serverModel.name || serverModel.Name || '',
                category: local?.category || 'Fast',
                latency: local?.latency || '',
                tokens: local?.tokens || '',
                description: serverModel.description || serverModel.Description || local?.description || '',
                icon: local?.icon || '⚡'
              };
            });
            setAvailableModels(mapped);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch models from server', err);
        });
    }
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

  // Debounced search effect
  useEffect(() => {
    if (!token) return;

    if (searchQuery.trim() === '') {
      loadConversations();
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await apiClient.get<Conversation[]>(
          `/conversations/search?query=${encodeURIComponent(searchQuery.trim())}`
        );
        setConversations(sortConversationsList(response.data));
      } catch (error) {
        console.error('Failed to search conversations', error);
        showToast('Search failed', 'error');
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, token]);

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
    setArchivedConversations([]);
    setSavedMessages([]);
    setActiveConversationId(null);
    setMessages([]);
    showToast('Signed out successfully', 'info');
  };

  const loadArchivedConversations = async () => {
    if (!token) return;
    try {
      const response = await apiClient.get<Conversation[]>('/conversations/archived');
      setArchivedConversations(response.data.sort((a, b) => new Date(b.archivedAt || b.createdAt).getTime() - new Date(a.archivedAt || a.createdAt).getTime()));
    } catch (error) {
      console.error('Failed to load archived conversations', error);
    }
  };

  const loadConversations = async () => {
    if (!token) return;
    try {
      const response = await apiClient.get<Conversation[]>('/conversations');
      setConversations(sortConversationsList(response.data));
      await loadArchivedConversations();
      await loadSavedMessages();
    } catch (error) {
      console.error('Failed to load conversations', error);
      showToast('Failed to load conversations from server', 'error');
    }
  };

  const archiveConversation = async (id: number): Promise<boolean> => {
    try {
      await apiClient.put(`/conversations/${id}/archive`);
      const conversationToArchive = conversations.find((c) => c.id === id);
      if (conversationToArchive) {
        const updatedConv: Conversation = {
          ...conversationToArchive,
          isArchived: true,
          archivedAt: new Date().toISOString(),
          isPinned: false,
          pinnedAt: undefined,
        };
        setConversations((prev) => prev.filter((c) => c.id !== id));
        setArchivedConversations((prev) => 
          [updatedConv, ...prev].sort((a, b) => new Date(b.archivedAt || b.createdAt).getTime() - new Date(a.archivedAt || a.createdAt).getTime())
        );
      }
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
      showToast('Conversation archived', 'success');
      return true;
    } catch (error) {
      console.error('Failed to archive conversation', error);
      showToast('Could not archive conversation', 'error');
      return false;
    }
  };

  const restoreConversation = async (id: number): Promise<boolean> => {
    try {
      await apiClient.put(`/conversations/${id}/restore`);
      const conversationToRestore = archivedConversations.find((c) => c.id === id);
      if (conversationToRestore) {
        const updatedConv: Conversation = {
          ...conversationToRestore,
          isArchived: false,
          archivedAt: undefined,
        };
        setArchivedConversations((prev) => prev.filter((c) => c.id !== id));
        setConversations((prev) => sortConversationsList([updatedConv, ...prev]));
      }
      showToast('Conversation restored', 'success');
      return true;
    } catch (error) {
      console.error('Failed to restore conversation', error);
      showToast('Could not restore conversation', 'error');
      return false;
    }
  };

  const loadSavedMessages = async () => {
    if (!token) return;
    try {
      const response = await apiClient.get<SavedMessage[]>('/messages/saved');
      setSavedMessages(response.data);
    } catch (error) {
      console.error('Failed to load saved responses', error);
    }
  };

  const saveMessage = async (messageId: number): Promise<boolean> => {
    try {
      await apiClient.post('/messages/save', { messageId });
      showToast('Response saved.', 'success');
      await loadSavedMessages();
      return true;
    } catch (error) {
      console.error('Failed to save message', error);
      showToast('Could not save response', 'error');
      return false;
    }
  };

  const unsaveMessage = async (messageId: number): Promise<boolean> => {
    try {
      await apiClient.delete(`/messages/save/${messageId}`);
      showToast('Removed from saved.', 'success');
      setSavedMessages((prev) => prev.filter((sm) => sm.messageId !== messageId));
      return true;
    } catch (error) {
      console.error('Failed to remove saved message', error);
      showToast('Could not remove from saved', 'error');
      return false;
    }
  };

  const toggleFeedback = async (messageId: number, type: 'Like' | 'Dislike'): Promise<boolean> => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return false;

    const currentFeedback = msg.feedbackType;

    try {
      if (currentFeedback === type) {
        // Remove reaction
        await apiClient.delete(`/messages/feedback/${messageId}`);
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, feedbackType: null } : m))
        );
        showToast('Feedback removed', 'info');
      } else if (currentFeedback === null || currentFeedback === undefined) {
        // Submit feedback
        await apiClient.post('/messages/feedback', { messageId, feedbackType: type });
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, feedbackType: type } : m))
        );
        showToast('Feedback submitted', 'success');
      } else {
        // Switch reaction
        await apiClient.put('/messages/feedback', { messageId, feedbackType: type });
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, feedbackType: type } : m))
        );
        showToast('Feedback updated', 'success');
      }
      return true;
    } catch (error) {
      console.error('Failed to update feedback', error);
      showToast('Could not update feedback', 'error');
      return false;
    }
  };

  const selectConversation = async (id: number) => {
    setActiveConversationId(id);
    setIsLoading(true);
    try {
      const response = await apiClient.get<any>(`/conversations/${id}`);
      setMessages(response.data.messages || []);
      if (response.data.selectedModel) {
        setSelectedModel(response.data.selectedModel);
      }
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
      setConversations((prev) => sortConversationsList([newConv, ...prev]));
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
      setArchivedConversations((prev) => prev.filter((c) => c.id !== id));
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

  const sortConversationsList = (list: Conversation[]): Conversation[] => {
    return [...list].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.isPinned && b.isPinned) {
        return new Date(b.pinnedAt || b.createdAt).getTime() - new Date(a.pinnedAt || a.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  const pinConversation = async (id: number, isPinned: boolean): Promise<boolean> => {
    try {
      await apiClient.patch(`/conversations/${id}/pin`, { isPinned });
      setConversations((prev) =>
        sortConversationsList(
          prev.map((c) =>
            c.id === id
              ? { ...c, isPinned, pinnedAt: isPinned ? new Date().toISOString() : undefined }
              : c
          )
        )
      );
      showToast(isPinned ? 'Conversation pinned' : 'Conversation unpinned', 'success');
      return true;
    } catch (error: any) {
      console.error('Failed to pin/unpin conversation', error);
      const errMsg = error?.response?.data?.errorMessage || 'Could not update pin status';
      showToast(errMsg, 'error');
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
      await socketService.sendMessage(targetConvId, text, selectedModel);
    } catch (error) {
      console.error('Failed to send message via SignalR', error);
      showToast('Failed to send message. Connecting...', 'error');
    }
  };

  const regenerateResponse = async (messageId: number) => {
    if (regeneratingMessageId !== null) return;
    setRegeneratingMessageId(messageId);
    try {
      await socketService.regenerateResponse(messageId, selectedModel);
    } catch (error) {
      console.error('Failed to regenerate response via SignalR', error);
      showToast('Failed to regenerate response.', 'error');
      setRegeneratingMessageId(null);
    }
  };

  const editMessage = async (messageId: number, content: string) => {
    if (isLoading) return;
    setEditingMessageId(messageId);
    try {
      await socketService.editMessage(messageId, content, selectedModel);
    } catch (error) {
      console.error('Failed to edit message via SignalR', error);
      showToast('Failed to edit message.', 'error');
      setEditingMessageId(null);
    }
  };

  const stopGenerating = async () => {
    try {
      await socketService.stopGenerating();
      setIsLoading(false);
      setSearchStatus(null);
      setRegeneratingMessageId(null);
      setEditingMessageId(null);
      setMessages((prev) => prev.map((m) => m.isStreaming ? { ...m, isStreaming: false } : m));
      showToast('Generation stopped', 'info');
    } catch (error) {
      console.error('Failed to stop generating', error);
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
        pinConversation,
        sendMessage,
        stopGenerating,
        clearMessages,
        showToast,
        selectedModel,
        setSelectedModel,
        availableModels,
        searchStatus,
        searchQuery,
        setSearchQuery,
        archivedConversations,
        loadArchivedConversations,
        archiveConversation,
        restoreConversation,
        regeneratingMessageId,
        regenerateResponse,
        editingMessageId,
        setEditingMessageId,
        editMessage,
        savedMessages,
        saveMessage,
        unsaveMessage,
        toggleFeedback,
        scrollToMessageId,
        setScrollToMessageId,
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
