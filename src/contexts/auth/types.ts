
import { SupabaseAuthError, AppError } from '@/lib/errors'; // Import new error types

export type UserRole = 'admin' | 'submissive' | 'user';

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: SupabaseAuthError | AppError | null }>;
  signUp: (email: string, password: string) => Promise<{ error?: SupabaseAuthError | AppError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: SupabaseAuthError | AppError | null }>;
}

