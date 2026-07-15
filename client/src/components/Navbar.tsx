import React, { useState, useRef, useEffect } from 'react';
import { Menu, Download, ChevronDown, FileText } from 'lucide-react';
import { useChat } from '../store/ChatContext';
import { exportToPDF, exportToMarkdown, exportToText } from '../services/exportService';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { conversations, activeConversationId, messages, user } = useChat();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const title = activeConv ? activeConv.title : '';

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (format: 'pdf' | 'md' | 'txt') => {
    if (!title || !messages || !user) return;
    setDropdownOpen(false);
    if (format === 'pdf') {
      exportToPDF(title, messages);
    } else if (format === 'md') {
      exportToMarkdown(title, messages);
    } else if (format === 'txt') {
      exportToText(title, messages);
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-zinc-950/40 border-b border-zinc-900/60 sticky top-0 z-30 backdrop-blur-md">
      <div className="flex items-center space-x-3.5 min-w-0">
        {/* Mobile Menu Icon */}
        <button
          onClick={onMenuClick}
          className="lg:hidden text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-900 focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold tracking-wide text-zinc-100">Nexa AI</span>
        </div>

        {isTemporaryMode ? (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400 tracking-wider border-l border-zinc-800/80 pl-3 ml-3">
            <span>🕶 Temporary Chat</span>
          </span>
        ) : title ? (
          <span className="text-xs font-medium text-zinc-550 truncate border-l border-zinc-800/80 pl-3.5 max-w-[150px] sm:max-w-[300px]">
            {title}
          </span>
        ) : null}
      </div>

      {/* Top Right Minimal Icons Area */}
      <div className="flex items-center space-x-3.5" ref={dropdownRef}>
        {user && activeConv && messages.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold shadow-sm transition-all focus:outline-none cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Chat</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-xl bg-zinc-950 border border-zinc-850 shadow-2xl z-50 py-1.5 backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-100">
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full flex items-center space-x-2.5 px-4 py-2 text-left text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-red-500" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => handleExport('md')}
                  className="w-full flex items-center space-x-2.5 px-4 py-2 text-left text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>Markdown</span>
                </button>
                <button
                  onClick={() => handleExport('txt')}
                  className="w-full flex items-center space-x-2.5 px-4 py-2 text-left text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Text</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
