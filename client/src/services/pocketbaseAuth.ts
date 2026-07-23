import { pb } from '../lib/pocketbase';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  created: string;
  updated: string;
}

export const pocketbaseAuth = {
  /**
   * Authenticate user with email and password using PocketBase
   */
  async loginWithPassword(email: string, pass: string) {
    const authData = await pb.collection('users').authWithPassword(email, pass);
    return {
      token: authData.token,
      record: authData.record as unknown as UserProfile,
    };
  },

  /**
   * Register a new user in PocketBase
   */
  async registerUser(email: string, pass: string, passConfirm: string, name?: string) {
    await pb.collection('users').create({
      email,
      password: pass,
      passwordConfirm: passConfirm,
      name: name || '',
    });

    // Automatically log in after registration
    const authData = await pb.collection('users').authWithPassword(email, pass);
    return {
      token: authData.token,
      record: authData.record as unknown as UserProfile,
    };
  },

  /**
   * Authenticate using OAuth2 provider (e.g., 'google', 'github')
   */
  async loginWithOAuth2(provider: string) {
    const authData = await pb.collection('users').authWithOAuth2({ provider });
    return {
      token: authData.token,
      record: authData.record as unknown as UserProfile,
    };
  },

  /**
   * Clear current authentication token and session
   */
  logout() {
    pb.authStore.clear();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('chatbot_token');
      localStorage.removeItem('chatbot_user');
    }
  },

  /**
   * Get current authenticated user profile
   */
  getCurrentUser(): UserProfile | null {
    if (!pb.authStore.isValid || !pb.authStore.model) {
      return null;
    }
    return pb.authStore.model as unknown as UserProfile;
  },

  /**
   * Check if user is currently authenticated
   */
  isLoggedIn(): boolean {
    return pb.authStore.isValid;
  },

  /**
   * Get current valid JWT token
   */
  getToken(): string | null {
    return pb.authStore.isValid ? pb.authStore.token : null;
  },
};
