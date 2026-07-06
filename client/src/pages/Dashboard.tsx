import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import ChatWindow from '../components/ChatWindow';
import { useChat } from '../store/ChatContext';

const Dashboard: React.FC = () => {
  const { loadConversations } = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch conversations on component mount
  useEffect(() => {
    loadConversations();
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-zinc-950 transition-colors">
      {/* Sidebar drawer control */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main viewport */}
      <div className="flex-grow flex flex-col min-w-0 h-full relative">
        {/* Mobile Header navbar */}
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Chat Feed & Textarea */}
        <ChatWindow />
      </div>
    </div>
  );
};

export default Dashboard;
