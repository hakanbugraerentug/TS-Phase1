
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
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  const handleLoginSuccess = (userData: any) => {
    const formattedUser: User = {
      name: userData.user.full_name,
      role: 'Personel', // Tüm kullanıcılar personel modunda başlar
      username: userData.user.username,
      employeeId: userData.user.employee_id,
      accessToken: userData.access_token
    };

    setUser(formattedUser);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <div className="min-h-screen">
      {isAuthenticated && user ? (
        <Dashboard onLogout={handleLogout} user={user} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
};

export default App;
