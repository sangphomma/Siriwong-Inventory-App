import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// กำหนดหน้าตาข้อมูล User
type UserData = {
  id: number;
  username: string;
  email: string;
  position: string; // นี่คือพระเอกของเรา!
};

type AuthContextType = {
  user: UserData | null;
  isLoading: boolean;
  login: (token: string, userData: UserData) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

// สร้าง Hook ไว้เรียกใช้ง่ายๆ (useAuth)
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // เปิดแอปปุ๊บ เช็คปั๊บ
  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      const token = await AsyncStorage.getItem('userToken');
      
      if (userData && token) {
        setUser(JSON.parse(userData));
      }
    } catch (e) {
      console.error("Auth Check Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string, userData: UserData) => {
    // บันทึกลงเครื่อง
    await AsyncStorage.setItem('userToken', token);
    await AsyncStorage.setItem('userData', JSON.stringify(userData));
    // อัปเดตตัวแปรในแอป
    setUser(userData);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};