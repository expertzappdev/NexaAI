import axios from 'axios';
import { pb } from '../lib/pocketbase';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://nexaai-b751.onrender.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to automatically attach PocketBase or JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = (pb.authStore.isValid ? pb.authStore.token : null) || localStorage.getItem('chatbot_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor to handle global errors (e.g. 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Only clear legacy local storage token if PocketBase auth store is not valid
      if (!pb.authStore.isValid) {
        localStorage.removeItem('chatbot_token');
        localStorage.removeItem('chatbot_user');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
