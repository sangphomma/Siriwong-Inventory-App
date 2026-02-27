import React from 'react';

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // ✅ จุดสำคัญ: ใช้ style={{ colorScheme: 'light' }} เพื่อบอกให้มือถือรู้ว่าโซนนี้คือหน้าสว่าง
    // ✅ และใส่ text-slate-900 bg-slate-50 บังคับสีฟอนต์และพื้นหลัง
    <div 
      style={{ colorScheme: 'light' }} 
      className="min-h-screen text-slate-900 bg-slate-50"
    >
      {children}
    </div>
  );
}