import React from 'react';
import { Sparkles } from 'lucide-react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-start space-x-3 max-w-[85%] mr-auto p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white flex-shrink-0">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="flex flex-col space-y-1">
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">AI Assistant</span>
        <div className="flex items-center space-x-2 pt-1.5">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Thinking</span>
          <div className="flex space-x-1 items-center h-2">
            <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full dot-anim"></span>
            <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full dot-anim"></span>
            <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full dot-anim"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
