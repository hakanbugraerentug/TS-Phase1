
import React, { useState } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';

export type UserRole = 'Personel';

export interface User {
  name: string;
  role: UserRole;
  username: string;
  employeeId: string;
  accessToken: string;
  title: string;
}

export interface LoginPayload {
  access_token: string;
  user: {
    full_name: string;
    username: string;
    employee_id: string;
    title?: string;
  };
}

const STORAGE_KEY = 'teamsync_user';

const loadStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(loadStoredUser);

  const handleLoginSuccess = (payload: LoginPayload) => {
    const formattedUser: User = {
      name: payload.user.full_name,
      role: 'Personel',
      username: payload.user.username,
      employeeId: payload.user.employee_id,
      accessToken: payload.access_token,
      title: payload.user.title ?? '',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formattedUser));
    setUser(formattedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return (
    <div className="min-h-screen">
      {user ? (
        <Dashboard onLogout={handleLogout} user={user} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
};

export default App;
