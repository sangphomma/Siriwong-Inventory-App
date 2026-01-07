import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type UserData = {
  id: number;
  username: string;
  email: string;
  position: string;
  documentId?: string;
};

type AuthContextType = {
  user: UserData | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, userData: UserData) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      const userToken = await AsyncStorage.getItem('userToken');
      
      if (userData && userToken) {
        setUser(JSON.parse(userData));
        setToken(userToken);
      }
    } catch (e) {
      console.error("Auth Check Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (newToken: string, userData: UserData) => {
    await AsyncStorage.setItem('userToken', newToken);
    await AsyncStorage.setItem('userData', JSON.stringify(userData));
    setUser(userData);
    setToken(newToken);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;