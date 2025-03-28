
export type AuthView = "login" | "signup" | "forgot-password" | "reset-password";

export interface AuthFormState {
  email: string;
  password: string;
  loading: boolean;
  loginError: string | null;
}

export interface AuthViewProps {
  currentView: AuthView;
  onViewChange: (view: AuthView) => void;
}
