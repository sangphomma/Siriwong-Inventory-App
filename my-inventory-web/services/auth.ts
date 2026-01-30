// services/auth.ts
import axios from 'axios';
import Cookies from 'js-cookie'; 
import { STRAPI_URL } from './config';

const AUTH_URL = `${STRAPI_URL}/api/auth`;
const API_URL = `${STRAPI_URL}/api`; // ✅ เพิ่มบรรทัดนี้เพื่อใช้ดึงข้อมูล User

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

// 1. ฟังก์ชัน Login (ฉบับอัปเกรด: ดึง Role ชัวร์ 100%)
export const login = async (identifier: string, password: string): Promise<LoginResponse> => {
  try {
    // Step 1: ยิง Login เพื่อขอ Token
    const response = await axios.post(`${AUTH_URL}/local`, {
      identifier,
      password,
    });
    
    const { jwt } = response.data;

    // Step 2: ✅ ใช้ Token ที่ได้ ยิงไปขอข้อมูล User + Role อีกรอบ (Force Populate)
    // เพราะ response จาก Login ปกติมักจะไม่ส่ง role.name มาให้
    const meResponse = await axios.get(`${API_URL}/users/me?populate=role`, {
        headers: {
            Authorization: `Bearer ${jwt}`
        }
    });

    const fullUser = meResponse.data;
    
    // Step 3: บันทึก Token และข้อมูล User ตัวเต็ม (ที่มี Role) ลง Cookie
    Cookies.set('token', jwt, { expires: 7 });
    Cookies.set('user', JSON.stringify(fullUser), { expires: 7 });

    // คืนค่ากลับไป (เอา user ตัวใหม่ส่งกลับไป)
    return { jwt, user: fullUser };

  } catch (error: any) {
    console.error("Login Error:", error);
    throw error.response?.data?.error || error;
  }
};

// 2. ฟังก์ชัน Logout
export const logout = () => {
  Cookies.remove('token');
  Cookies.remove('user');
  window.location.href = '/login'; 
};

// 3. Helper ดึง Token ปัจจุบัน
export const getToken = () => Cookies.get('token');

// 4. Helper ดึง User ปัจจุบัน
export const getUser = (): User | null => {
  const userStr = Cookies.get('user');
  return userStr ? JSON.parse(userStr) : null;
};