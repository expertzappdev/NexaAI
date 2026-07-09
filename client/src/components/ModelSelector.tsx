import React from 'react';
import { useChat } from '../store/ChatContext';

const ModelSelector: React.FC = () => {
  const { selectedModel, setSelectedModel, availableModels } = useChat();

  return (
    <div className="relative inline-block text-left">
      <select
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
        className="block cursor-pointer rounded-xl border border-zinc-800/80 bg-zinc-900/60 px-4 py-2 pr-10 text-sm font-semibold text-zinc-200 transition-all duration-250 hover:border-zinc-700/80 hover:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-600 appearance-none shadow-md backdrop-blur-md"
        style={{
          backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
          backgroundPosition: 'right 0.75rem center',
          backgroundSize: '1.25rem',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {availableModels.map((model) => (
          <option key={model.id} value={model.id} className="bg-zinc-950 text-zinc-200 py-2">
            {model.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ModelSelector;
