import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
// 1. นำเข้า AuthProvider
import { AuthProvider } from "./context/AuthContext"; 

const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
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
      <body className={`${prompt.className} antialiased`}>
        {/* 2. เอา AuthProvider มาครอบ children ไว้ตรงนี้ครับ */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}