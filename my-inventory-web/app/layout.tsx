import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 👇 แก้ไขข้อมูล Metadata ตรงนี้ครับ
export const metadata: Metadata = {
  title: "Siriwong Inventory Portal",
  description: "Web Portal for Siriwong Inventory System & Documentation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th"> {/* เปลี่ยนเป็น th เพื่อให้ Browser รู้ว่าเป็นเว็บไทย */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50`}
      >
        {children}
      </body>
    </html>
  );
}