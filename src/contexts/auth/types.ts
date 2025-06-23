
import { SupabaseAuthError, AppError } from '@/lib/errors'; // Import new error types
import type { User, Session, AuthResponse } from '@supabase/supabase-js'; // Import User and Session

export type UserRole = 'sub' | 'dom'; // Strict role typing for database validation

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: SupabaseAuthError | AppError | null, user?: User | null, session?: Session | null }>;
  signUp: (email: string, password: string) => Promise<{ error?: SupabaseAuthError | AppError | null, data?: AuthResponse['data'] | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: SupabaseAuthError | AppError | null }>;
}
