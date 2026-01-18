// ⚙️ constants/Config.ts

// แค่แก้ IP ตรงนี้ที่เดียว... ทุกหน้าในแอปจะเปลี่ยนตามหมดครับ!
//const SERVER_IP = "10.123.57.2";    // samsung A55

//const SERVER_IP = "192.168.1.49";  // Office siriwong
//const SERVER_IP = "siriwong.online"; 

// const SERVER_IP = "siriwong.online"; // ❌ ปิดอันนี้ไปก่อน
const SERVER_IP = "103.13.228.79";      // ✅ ใช้อันนี้ครับ (IP ของ VPS คุณ)
const PORT = "1337";


// URL หลัก (สำหรับรูปภาพ)
export const BASE_URL = `http://${SERVER_IP}:${PORT}`;

// URL สำหรับ API (สำหรับดึงข้อมูล)
export const API_URL = `${BASE_URL}/api`;








