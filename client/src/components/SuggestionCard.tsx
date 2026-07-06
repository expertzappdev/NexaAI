import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface SuggestionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ title, description, icon: Icon, onClick }) => {
  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex flex-col text-left p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900/60 hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <div className="flex items-center space-x-2 mb-2">
        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{title}</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{description}</p>
    </motion.button>
  );
};

export default SuggestionCard;
