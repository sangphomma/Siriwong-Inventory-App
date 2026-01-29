// services/auth.ts
import axios from 'axios';
import Cookies from 'js-cookie'; // ต้อง npm install js-cookie @types/js-cookie
import { STRAPI_URL } from './config';

const AUTH_URL = `${STRAPI_URL}/api/auth`;

// Type ของ User ที่เราจะใช้ใน App
export interface User {
  id: number;
  username: string;
  email: string;
  confirmed: boolean;
  blocked: boolean;
  role: {
    id: number;
    name: string;
    type: string;
  };
}

interface LoginResponse {
  jwt: string;
  user: User;
}

// 1. ฟังก์ชัน Login
export const login = async (identifier: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await axios.post(`${AUTH_URL}/local`, {
      identifier,
      password,
    });
    
    const { jwt, user } = response.data;
    
    // Set Token & User ลง Cookie (หมดอายุใน 7 วัน)
    // หมายเหตุ: การเก็บ User object ลง Cookie ทำให้ Middleware อ่านค่าได้ง่าย แต่ต้องระวังขนาดไฟล์
    Cookies.set('token', jwt, { expires: 7 });
    Cookies.set('user', JSON.stringify(user), { expires: 7 });

    return response.data;
  } catch (error: any) {
    throw error.response?.data?.error || error;
  }
};

// 2. ฟังก์ชัน Logout
export const logout = () => {
  Cookies.remove('token');
  Cookies.remove('user');
  // บังคับ Reload หน้าเว็บเพื่อให้ Context เคลียร์ค่า
  window.location.href = '/login'; 
};

// 3. Helper ดึง Token ปัจจุบัน
export const getToken = () => Cookies.get('token');

// 4. Helper ดึง User ปัจจุบัน
export const getUser = (): User | null => {
  const userStr = Cookies.get('user');
  return userStr ? JSON.parse(userStr) : null;
};