import type { Metadata } from "next";
// 1. import ฟอนต์ Prompt
import { Prompt } from "next/font/google"; 
import "./globals.css";

// 2. ตั้งค่าฟอนต์ (เลือกน้ำหนักและ subset ภาษาไทย)
const prompt = Prompt({
  subsets: ["latin", "thai"], // สำคัญมาก! ต้องใส่ 'thai' เพื่อให้สระไม่ลอย
  weight: ["300", "400", "500", "600", "700"], // โหลดน้ำหนักที่ใช้บ่อย
  variable: "--font-prompt", // (เผื่อใช้กับ Tailwind)
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Siriwong Inventory",
  description: "Construction Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      {/* 3. เรียกใช้ className ที่ body เพื่อให้เป็นฟอนต์หลักทั้งเว็บ */}
      <body className={`${prompt.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}