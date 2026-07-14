import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../store/ChatContext';
import { ChevronUp, ChevronDown } from 'lucide-react';

const ModelSelector: React.FC = () => {
  const { selectedModel, setSelectedModel, availableModels } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCollapsedDisplay = (modelId: string) => {
    const model = availableModels.find((m) => m.id === modelId);
    if (!model) return '⚡ Llama Instant';

    switch (model.id) {
      case 'llama-3.1-8b-instant':
        return '⚡ Llama Instant';
      case 'llama-3.3-70b-versatile':
        return '⭐ Llama Pro';
      case 'qwen/qwen3.6-27b':
        return '💻 Qwen Code';
      case 'qwen/qwen3-32b':
        return '🧠 Qwen Think';
      case 'groq/compound-mini':
        return '🤖 Compound Mini';
      case 'nexa-web-search':
        return '🌐 Nexa Search';
      default:
        return `${model.icon || '🤖'} ${model.name}`;
    }
  };

  const getBadgeColor = (category: string) => {
    const catLower = category.toLowerCase();
    if (catLower.includes('fast')) return 'bg-sky-500/10 text-sky-400 border-sky-500/25';
    if (catLower.includes('pro')) return 'bg-amber-500/10 text-amber-400 border-amber-500/25';
    if (catLower.includes('code')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
    if (catLower.includes('think')) return 'bg-purple-500/10 text-purple-400 border-purple-500/25';
    if (catLower.includes('search')) return 'bg-blue-500/10 text-blue-400 border-blue-500/25';
    return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/25';
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-950/80 text-sm font-semibold text-zinc-200 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900 focus:outline-none shadow-md backdrop-blur-md"
      >
        <span>{getCollapsedDisplay(selectedModel)}</span>
        {isOpen ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronUp className="w-4 h-4 text-zinc-400" />}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-3 w-80 md:w-[350px] rounded-2xl border border-zinc-800/80 bg-[#111111] shadow-[0_12px_40px_rgba(0,0,0,0.9)] focus:outline-none z-[100] overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Header/Title */}
          <div className="px-4 py-2.5 border-b border-zinc-900 text-xs font-semibold text-zinc-500 tracking-wider uppercase bg-zinc-950/40">
            Select AI Model
          </div>

          {/* List of Models */}
          <div className="max-h-[380px] overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
            {availableModels.map((model) => {
              const isSelected = selectedModel === model.id;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    setSelectedModel(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl transition-all duration-200 border ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-purple-500/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                      : 'border-transparent hover:bg-zinc-900/60 hover:border-zinc-800/40 text-zinc-300 hover:text-white'
                  } group`}
                >
                  {/* Title & Category Badge */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base group-hover:scale-110 transition-transform duration-200">
                        {model.icon || '⚡'}
                      </span>
                      <span className="font-semibold text-sm tracking-wide">{model.name}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getBadgeColor(model.category)}`}>
                      {model.category}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-400 leading-relaxed mb-1.5 font-normal pl-7">
                    {model.description}
                  </p>

                  {/* Stats Footer */}
                  <div className="text-[10px] text-zinc-500 pl-7 font-medium flex items-center gap-1.5">
                    <span>{model.latency}</span>
                    <span className="text-zinc-700">•</span>
                    <span>{model.tokens}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
