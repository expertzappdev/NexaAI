import PocketBase from 'pocketbase';

const defaultUrl = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:8090`
  : 'http://localhost:8090';

export const POCKETBASE_URL = import.meta.env?.VITE_POCKETBASE_URL || defaultUrl;

// Singleton PocketBase client instance with auto-persisted auth store in browser localStorage
export const pb = new PocketBase(POCKETBASE_URL);
