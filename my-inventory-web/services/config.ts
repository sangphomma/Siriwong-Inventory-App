//export const STRAPI_URL = 'http://localhost:1337';

// เลือก URL ตามสภาพแวดล้อม (Localhost หรือ Server จริง)
// export const STRAPI_URL = 'https://siriwong.online';
 //export const STRAPI_URL = 'http://192.168.1.49:1337';
//export const STRAPI_URL = 'http://localhost:1337';


// ✅ Logic: ถ้าเป็น Production (บน Server) ให้ใช้โดเมนจริง, ถ้าไม่ใช่ ให้ใช้ Localhost
// ✅ แก้ไข: เติม :1337 ต่อท้ายโดเมน
export const STRAPI_URL = process.env.NODE_ENV === 'production' 
  ? 'http://siriwong.online:1337'  // 👈 ใส่ port 1337 และใช้ http (ถ้ายังไม่มี SSL)
  : 'http://localhost:1337';
