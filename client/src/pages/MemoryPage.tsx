import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import MemoryManager from '../components/MemoryManager';

const MemoryPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.title = 'Nexa AI - Memory';
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050505] text-zinc-150 transition-colors">
      {/* Sidebar drawer control */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main viewport */}
      <div className="flex-grow flex flex-col min-w-0 h-full relative">
        {/* Header navbar */}
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Memory Dashboard content */}
        <MemoryManager />
      </div>
    </div>
  );
};

export default MemoryPage;
