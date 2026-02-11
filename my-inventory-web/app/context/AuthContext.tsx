// context/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// ✅ import จาก services/auth ถูกแล้วครับ
import { login as authLogin, logout as authLogout, getUser, getToken, User } from '../../services/auth'; 

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (id: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = getUser(); // ดึง User จาก Cookie
    const token = getToken(); // ดึง Token จาก Cookie
    if (storedUser && token) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = async (identifier: string, pass: string) => {
    // เรียกใช้ service เพื่อ login
    const { user: userData } = await authLogin(identifier, pass); //
    
    // อัปเดต state user
    setUser(userData);
    
    // ❌ ลบบรรทัด router.push('/manage') ออกไปแล้ว
    // เพื่อให้ LoginPage เป็นคนตัดสินใจ redirect เอง (เผื่อกรณีมี returnUrl)
  };

  const logout = () => {
    authLogout();
    setUser(null);
    router.push('/login'); // logout ยังคง redirect ไป login ได้เหมือนเดิม
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};