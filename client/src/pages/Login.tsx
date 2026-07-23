import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useChat } from '../store/ChatContext';
import apiClient from '../api/client';
import { pocketbaseAuth } from '../services/pocketbaseAuth';
import type { AuthResponse } from '../types';

const Login: React.FC = () => {
  const { login } = useChat();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Nexa AI - Log In';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      // 1. Try primary PocketBase authentication
      try {
        const pbResult = await pocketbaseAuth.loginWithPassword(email.trim(), password);
        if (pbResult.token && pbResult.record) {
          const userObj = {
            id: pbResult.record.id,
            email: pbResult.record.email,
            name: pbResult.record.name || pbResult.record.email.split('@')[0],
          };
          login(pbResult.token, userObj);
          navigate('/chat');
          return;
        }
      } catch (pbErr: any) {
        // If PocketBase returns invalid credentials or isn't reached, log warning and try backend fallback
        console.warn('PocketBase auth warning:', pbErr?.message || pbErr);
      }

      // 2. Fallback to ASP.NET Core auth endpoint if legacy user
      const response = await apiClient.post<AuthResponse>('/auth/login', {
        email: email.trim(),
        password,
      });

      if (response.data.success && response.data.token && response.data.user) {
        login(response.data.token, response.data.user);
        navigate('/chat');
      } else {
        setError(response.data.errorMessage || 'Invalid credentials.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.errorMessage || 
        err.response?.data?.Email?.[0] ||
        err?.message ||
        'Failed to log in. Please check your credentials or PocketBase server.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] bg-radial-gradient px-4 py-12 relative overflow-hidden">
      {/* Background Glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-purple-500/10 blur-[100px] rounded-full -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="max-w-md w-full space-y-7 p-10 rounded-[28px] border border-white/5 bg-zinc-900/40 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      >
        {/* Top Logo */}
        <div className="text-center">
          <div className="relative mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-[0_0_35px_rgba(99,102,241,0.35)] mb-5 border border-white/10">
            <span className="text-2xl font-black font-sans">N</span>
            <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-md -z-10" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back to</h2>
          <h2 className="text-2xl font-black text-white tracking-tight -mt-1">Nexa AI</h2>
        </div>

        {error && (
          <div className="flex items-center space-x-2.5 p-3.5 rounded-xl border border-red-950/20 bg-red-950/10 text-red-400 text-xs">
            <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl pl-11 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Password</label>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider cursor-not-allowed hover:underline">Forgot?</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl pl-11 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-medium"
                />
              </div>
            </div>
          </div>

          {/* Action Button (Blue-to-Purple Gradient) */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white font-bold text-sm transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:brightness-110 focus:outline-none"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-zinc-500 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:underline font-bold">
              Create your Nexa AI account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
