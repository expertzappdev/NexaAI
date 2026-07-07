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
