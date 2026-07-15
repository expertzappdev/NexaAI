import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import ChatWindow from '../components/ChatWindow';
import ShortcutModal from '../components/ShortcutModal';
import { useChat } from '../store/ChatContext';

const Dashboard: React.FC = () => {
  const { loadConversations, createConversation } = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isShortcutOpen, setIsShortcutOpen] = useState(false);

  useEffect(() => {
    document.title = 'Nexa AI - Workspace';
    loadConversations();
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl + K: Focus conversation search
      if (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSidebarOpen(true);
        setTimeout(() => {
          document.getElementById('conversation-search')?.focus();
        }, 150);
        return;
      }

      // Ctrl + Shift + N: Create new chat
      if (e.key.toLowerCase() === 'n' && e.shiftKey && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        createConversation("New Chat");
        return;
      }

      // Ctrl + /: Focus chat input
      if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        document.getElementById('chat-input-textarea')?.focus();
        return;
      }

      // Esc: Close dialogs or menus
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setIsShortcutOpen(false);
        return;
      }

      // ?: Show shortcut help dialog (only when not typing in an input/textarea)
      if (e.key === '?' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsShortcutOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [createConversation]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050505] text-zinc-150 transition-colors">
      {/* Sidebar drawer control */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onShortcutClick={() => setIsShortcutOpen(true)}
      />

      {/* Main viewport */}
      <div className="flex-grow flex flex-col min-w-0 h-full relative">
        {/* Header navbar */}
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Chat Feed & Textarea */}
        <ChatWindow />
      </div>

      {/* Shortcut Help Dialog */}
      <ShortcutModal isOpen={isShortcutOpen} onClose={() => setIsShortcutOpen(false)} />
    </div>
  );
};

export default Dashboard;
