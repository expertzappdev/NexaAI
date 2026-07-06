import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, User, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useChat } from '../store/ChatContext';
import apiClient from '../api/client';
import type { AuthResponse } from '../types';

const Register: React.FC = () => {
  const { login } = useChat();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (response.data.success && response.data.token) {
        login(response.data.token, response.data.email || email, response.data.name || name);
        navigate('/');
      } else {
        setError(response.data.errorMessage || 'Registration failed.');
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.errorMessage || 
        err.response?.data?.Email?.[0] ||
        err.response?.data?.Password?.[0] ||
        'An error occurred. Check connection or if the email is already in use.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4 py-12 transition-colors">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 p-8 rounded-3xl border border-gray-200 dark:border-zinc-900 bg-white dark:bg-zinc-900 shadow-xl shadow-gray-200/20 dark:shadow-none"
      >
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Create Account</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1.5">Register to start asking AI questions</p>
        </div>

        {error && (
          <div className="flex items-center space-x-2.5 p-3.5 rounded-xl border border-red-200 dark:border-red-950/20 bg-red-50/50 dark:bg-red-950/10 text-red-600 dark:text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {/* Name Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent border border-gray-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-800 dark:text-zinc-150 placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border border-gray-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-800 dark:text-zinc-150 placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border border-gray-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-800 dark:text-zinc-150 placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent border border-gray-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-800 dark:text-zinc-150 placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Sign Up</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-gray-500 dark:text-zinc-500">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
