import PocketBase from 'pocketbase';

const defaultUrl = 'https://nexaai-production-d7c5.up.railway.app';

export const POCKETBASE_URL = import.meta.env?.VITE_POCKETBASE_URL || defaultUrl;

// Singleton PocketBase client instance with auto-persisted auth store in browser localStorage
export const pb = new PocketBase(POCKETBASE_URL);
