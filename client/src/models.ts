export interface AIModel {
  id: string;
  name: string;
  category: string;
  latency: string;
  tokens: string;
  description: string;
  icon: string;
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 Instant',
    category: 'Fast',
    latency: '106 ms',
    tokens: '469 tokens/sec',
    description: 'Ultra fast lightweight assistant for daily conversations.',
    icon: '⚡',
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 Versatile',
    category: 'Pro',
    latency: '158 ms',
    tokens: '303 tokens/sec',
    description: 'Powerful general purpose model for reasoning, writing and professional tasks.',
    icon: '⭐',
  },
  {
    id: 'qwen/qwen3.6-27b',
    name: 'Qwen 3.6 27B',
    category: 'Code',
    latency: '390 ms',
    tokens: '520 tokens/sec',
    description: 'Optimized coding model for development, debugging and technical tasks.',
    icon: '💻',
  },
  {
    id: 'qwen/qwen3-32b',
    name: 'Qwen 3 32B',
    category: 'Think',
    latency: '631 ms',
    tokens: '441 tokens/sec',
    description: 'Advanced reasoning model for complex problem solving.',
    icon: '🧠',
  },
  {
    id: 'groq/compound-mini',
    name: 'Compound Mini',
    category: 'Agent Fast',
    latency: '1116 ms',
    tokens: '297 tokens/sec',
    description: 'Fast agent model with tool reasoning ability.',
    icon: '🤖',
  },
  {
    id: 'nexa-web-search',
    name: 'Nexa Web Search',
    category: 'Search',
    latency: 'Variable',
    tokens: 'Groq + Tavily',
    description: 'AI assistant powered with real-time web knowledge',
    icon: '🌐',
  },
];
