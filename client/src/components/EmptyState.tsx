import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Code2, Bug, Calendar, FileText, Lightbulb } from 'lucide-react';
import SuggestionCard from './SuggestionCard';
import { useChat } from '../store/ChatContext';

const EmptyState: React.FC = () => {
  const { sendMessage } = useChat();

  const suggestions = [
    {
      title: 'Explain Concepts',
      description: 'Break down complex theories into simple, digestible explanations.',
      icon: Sparkles,
      prompt: 'Explain quantum computing in simple terms for a beginner.',
    },
    {
      title: 'Generate Code',
      description: 'Create boilerplate, functions, or full modules in any language.',
      icon: Code2,
      prompt: 'Generate an ASP.NET Core 8 controller template handling CRUD operations for a resource named Product.',
    },
    {
      title: 'Debug Errors',
      description: 'Paste your stack trace and get instant fixes and optimizations.',
      icon: Bug,
      prompt: 'Analyze and fix this database connection timeout exception in my ASP.NET Core configuration.',
    },
    {
      title: 'Plan Projects',
      description: 'Build roadmaps, sprint tasks, and technical documentation.',
      icon: Calendar,
      prompt: 'Build a 4-week sprint roadmap for creating a real-time chat application with web sockets.',
    },
    {
      title: 'Summarize Content',
      description: 'Extract key insights from long documents or meeting transcripts.',
      icon: FileText,
      prompt: 'Provide a concise, bulleted summary of this text, highlighting the key take-aways.',
    },
    {
      title: 'Brainstorm Ideas',
      description: 'Generate unique perspectives for your next big creative venture.',
      icon: Lightbulb,
      prompt: 'Let\'s brainstorm some creative SaaS application ideas targeting developer productivity.',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center max-w-3xl mx-auto min-h-[70vh] px-4 py-8 text-center">
      {/* Premium Nexa AI Logo Icon with Glow */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.4)] mb-8 text-white border border-indigo-400/20"
      >
        <span className="text-4xl font-black font-sans tracking-tight">N</span>
        <div className="absolute inset-0 rounded-2xl bg-indigo-500/10 blur-xl -z-10" />
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-3"
      >
        Welcome to Nexa AI
      </motion.h1>
      
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-sm text-zinc-400 mb-12 max-w-lg mx-auto leading-relaxed"
      >
        What can we create today? Your real-time AI assistant for coding, learning and productivity.
      </motion.p>

      {/* Suggestion Cards Grid (3x2 layout) */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full"
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
