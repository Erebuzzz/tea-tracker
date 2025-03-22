export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export interface Tea {
  id?: string;
  userId: string;
  name: string;
  type: string;
  quantity: number;
  consumptionDate: Date;
}

export interface TeaWeekLimit {
  week: number;
  minCups: number;
  maxCups: number;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  reminders: boolean;
}