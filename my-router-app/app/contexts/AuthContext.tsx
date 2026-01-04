import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// กำหนดหน้าตาข้อมูล User
type UserData = {
  id: number;
  username: string;
  email: string;
  position: string;
  documentId?: string; // เพิ่มเผื่อไว้สำหรับ Strapi v5
};

type AuthContextType = {
  user: UserData | null;
  token: string | null; // ⭐ เพิ่มตัวนี้: ส่ง Token ออกไปให้ใช้
  isLoading: boolean;
  login: (token: string, userData: UserData) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null, // ⭐ เริ่มต้นเป็น null
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null); // ⭐ สร้าง State เก็บ Token
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      const userToken = await AsyncStorage.getItem('userToken'); // ใช้ชื่อกุญแจเดิมของคุณ ('userToken')
      
      if (userData && userToken) {
        setUser(JSON.parse(userData));
        setToken(userToken); // ⭐ โหลดเสร็จก็เก็บเข้าตัวแปร
      }
    } catch (e) {
      console.error("Auth Check Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (newToken: string, userData: UserData) => {
    // บันทึกลงเครื่อง
    await AsyncStorage.setItem('userToken', newToken);
    await AsyncStorage.setItem('userData', JSON.stringify(userData));
    
    // อัปเดตตัวแปรในแอป
    setUser(userData);
    setToken(newToken); // ⭐ อัปเดต Token ทันทีที่ล็อกอิน
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    setUser(null);
    setToken(null); // ⭐ ล้าง Token ออก
  };

  // ส่ง token ออกไปให้ลูกๆ ใช้ด้วย
  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};