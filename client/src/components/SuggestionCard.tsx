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
      whileHover={{ y: -4, border: '1px solid rgba(139, 92, 246, 0.4)', boxShadow: '0 0 25px rgba(139, 92, 246, 0.15)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex flex-col text-left p-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md hover:bg-zinc-900/60 transition-all focus:outline-none"
    >
      <div className="flex items-center space-x-3 mb-2.5">
        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-bold text-sm text-zinc-150 tracking-tight text-white">{title}</span>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed font-normal">{description}</p>
    </motion.button>
  );
};

export default SuggestionCard;
