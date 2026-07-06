import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChatProvider } from './store/ChatContext';
import Dashboard from './pages/Dashboard';

const AppContent: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Dashboard chats workspace directly */}
        <Route path="/" element={<Dashboard />} />

        {/* Catch all fallback redirects */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <ChatProvider>
      <AppContent />
    </ChatProvider>
  );
};

export default App;
