
export type AuthView = "login" | "signup" | "forgot-password" | "reset-password";

export interface AuthError {
  message: string;
}

export interface AuthFormState {
  email: string;
  password: string;
  role?: 'dominant' | 'submissive'; // Add role for signup
  loading: boolean;
  loginError: string | null;
}

export interface AuthViewProps {
  currentView: AuthView;
  onViewChange: (view: AuthView) => void;
}
