import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Code2, FileText, Lightbulb } from 'lucide-react';
import SuggestionCard from './SuggestionCard';
import { useChat } from '../store/ChatContext';

const EmptyState: React.FC = () => {
  const { sendMessage } = useChat();

  const suggestions = [
    {
      title: 'Explain a concept',
      description: 'Break down complex topics into clear, simplified explanations.',
      icon: Sparkles,
      prompt: 'Explain quantum computing in simple terms for a beginner.',
    },
    {
      title: 'Generate code',
      description: 'Write robust functions, API endpoints, or component structures.',
      icon: Code2,
      prompt: 'Generate an ASP.NET Core 8 controller template handling CRUD operations for a resource named Product.',
    },
    {
      title: 'Summarize content',
      description: 'Distill articles, documents, or meeting notes into key bullet points.',
      icon: FileText,
      prompt: 'Provide a concise, bulleted summary of this text, highlighting the key take-aways.',
    },
    {
      title: 'Brainstorm ideas',
      description: 'Develop creative naming, marketing ideas, or system designs.',
      icon: Lightbulb,
      prompt: 'Let\'s brainstorm some creative SaaS application ideas targeting developer productivity.',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center max-w-3xl mx-auto min-h-[70vh] px-4 py-8 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6 text-white"
      >
        <Sparkles className="w-8 h-8 animate-pulse" />
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2"
      >
        Welcome to Nexa AI
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="text-lg text-zinc-300 font-semibold mb-2"
      >
        How can I help you today?
      </motion.p>
      
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-xs text-zinc-550 mb-10 max-w-md mx-auto"
      >
        Your premium real-time AI assistant platform. Ask questions, generate code, summarize documents, and brainstorm ideas.
      </motion.p>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl"
      >
        {suggestions.map((item, index) => (
          <SuggestionCard
            key={index}
            title={item.title}
            description={item.description}
            icon={item.icon}
            onClick={() => sendMessage(item.prompt)}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default EmptyState;
