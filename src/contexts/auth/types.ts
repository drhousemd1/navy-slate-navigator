
import { Session, User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'user';

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string) => Promise<{ error: any | null; data: any | null }>;
  resetPassword: (email: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  loading: boolean;
  isAdmin: boolean;
  userRole: UserRole | null;
  checkUserRole: () => Promise<void>;
  updateNickname: (nickname: string) => void;
  getNickname: () => string;
  updateProfileImage: (imageUrl: string) => void;
  getProfileImage: () => string;
  getUserRole: () => string;
  updateUserRole: (role: string) => void;
}
