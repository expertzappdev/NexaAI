import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Code2, Database, Terminal, FileText, Layers } from 'lucide-react';
import SuggestionCard from './SuggestionCard';
import { useChat } from '../store/ChatContext';

const EmptyState: React.FC = () => {
  const { sendMessage } = useChat();

  const suggestions = [
    {
      title: 'Explain Spring Boot',
      description: 'Understand core MVC, IoC, autoconfiguration, and dependency injection principles.',
      icon: Layers,
      prompt: 'Explain Spring Boot core concepts like dependency injection and autoconfiguration in simple terms.',
    },
    {
      title: 'Write Java Code',
      description: 'Implement robust methods, structures, or design patterns in OOP.',
      icon: Terminal,
      prompt: 'Write a clean, optimized Java method demonstrating the Singleton and Factory design patterns.',
    },
    {
      title: 'Fix My SQL Query',
      description: 'Optimize joins, fix grouping issues, or write custom aggregates.',
      icon: Database,
      prompt: 'Analyze and fix this SQL query to optimize indexes and eliminate redundancy:\nSELECT * FROM Users JOIN Conversations ON Users.Id = Conversations.UserId;',
    },
    {
      title: 'Generate React Component',
      description: 'Build modern functional components with hooks and Tailwind CSS.',
      icon: Code2,
      prompt: 'Generate a modern, responsive React functional component for a toggleable side drawer using Tailwind CSS.',
    },
    {
      title: 'Summarize Text',
      description: 'Distill long documents, articles, or logs into key summaries.',
      icon: FileText,
      prompt: 'Provide a concise, bulleted summary of this system log text, highlighting all critical errors.',
    },
    {
      title: 'Create Web API',
      description: 'Outline REST controllers, models, and dependencies.',
      icon: Sparkles,
      prompt: 'Design a RESTful controller in ASP.NET Core 8 Web API mapping CRUD operations for a resource named Product.',
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
        className="text-3xl sm:text-4xl font-extrabold text-gray-800 dark:text-white tracking-tight mb-2"
      >
        How can I help you today?
      </motion.h1>
      
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-sm text-gray-500 dark:text-gray-400 mb-10 max-w-md mx-auto"
      >
        Ask anything, generate code, optimize configurations, or summarize documents instantly.
      </motion.p>

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
