export interface User {
  id: number | string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface Conversation {
  id: number | string;
  userId: number | string;
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
  id: number | string;
  conversationId: number | string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  model?: string;
  isEdited?: boolean;
  editedAt?: string;
  isStopped?: boolean;
  isStreaming?: boolean;
  createdAt: string;
  feedbackType?: 'Like' | 'Dislike' | null;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  errorMessage?: string;
  user?: {
    id: number | string;
    name: string;
    email: string;
  };
}

export interface ChatResponse {
  success: boolean;
  message: string;
  model?: string;
  totalTokens?: number;
  isStopped?: boolean;
  messageId?: number;
}

export interface SavedMessage {
  id: number | string;
  messageId: number | string;
  conversationId: number | string;
  conversationTitle: string;
  content: string;
  createdAt: string;
}
