import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChatProvider, useChat } from './store/ChatContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';

const PrivateRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const { token } = useChat();
  return token ? element : <Navigate to="/login" replace />;
};

const AppContent: React.FC = () => {
  const { token } = useChat();

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={!token ? <Login /> : <Navigate to="/chat" replace />} />
        <Route path="/register" element={!token ? <Register /> : <Navigate to="/chat" replace />} />

        {/* Protected route */}
        <Route path="/chat" element={<PrivateRoute element={<Dashboard />} />} />

        {/* Default route */}
        <Route path="/" element={<Navigate to={token ? "/chat" : "/login"} replace />} />

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
