// ⚙️ constants/Config.ts

// แค่แก้ IP ตรงนี้ที่เดียว... ทุกหน้าในแอปจะเปลี่ยนตามหมดครับ!
//const SERVER_IP = "10.123.57.2";    // samsung A55

//const SERVER_IP = "192.168.1.49";  // Office siriwong
const SERVER_IP = "siriwong.online"; 
const PORT = "1337";

// URL หลัก (สำหรับรูปภาพ)
export const BASE_URL = `http://${SERVER_IP}:${PORT}`;

// URL สำหรับ API (สำหรับดึงข้อมูล)
export const API_URL = `${BASE_URL}/api`;








