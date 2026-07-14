import React from 'react';
import { Sparkles, Globe } from 'lucide-react';
import { useChat } from '../store/ChatContext';

const TypingIndicator: React.FC = () => {
  const { searchStatus } = useChat();

  return (
    <div className="flex items-start space-x-3.5 max-w-[85%] mr-auto p-4.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 shadow-lg backdrop-blur-md">
      <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0 border border-white/5 shadow-[0_0_12px_rgba(99,102,241,0.25)]">
        {searchStatus ? <Globe className="w-4 h-4 animate-spin [animation-duration:3s]" /> : <Sparkles className="w-4 h-4" />}
      </div>
      <div className="flex flex-col space-y-1">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nexa AI</span>
        <div className="flex items-center space-x-2 pt-1">
          <span className="text-sm font-semibold text-zinc-300">
            {searchStatus ? (
              <span className="flex items-center gap-1.5 text-blue-400">
                🌐 {searchStatus}
              </span>
            ) : (
              'Thinking'
            )}
          </span>
          <div className="flex space-x-1 items-center h-2">
            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full dot-anim"></span>
            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full dot-anim"></span>
            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full dot-anim"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
