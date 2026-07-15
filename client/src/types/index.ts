export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface Conversation {
  id: number;
  userId: number;
  title: string;
  selectedModel?: string;
  isPinned: boolean;
  pinnedAt?: string;
  isArchived: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  conversationId: number;
  role: 'system' | 'user' | 'assistant';
  content: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  model?: string;
  createdAt: string;
  feedbackType?: 'Like' | 'Dislike' | null;
  isStreaming?: boolean;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  errorMessage?: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface ChatResponse {
  success: boolean;
  message: string;
  model?: string;
  totalTokens?: number;
}

export interface SavedMessage {
  id: number;
  messageId: number;
  conversationId: number;
  conversationTitle: string;
  content: string;
  createdAt: string;
}
