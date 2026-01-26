'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, use } from 'react';

export default function AdminProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const [isFabOpen, setIsFabOpen] = useState(false);

  // ฟังก์ชันเช็คว่าเมนูไหน Active อยู่
  const isActive = (path: string) => pathname.endsWith(path) || pathname.includes(path + '/');

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      
      {/* ✅ 1. Top Navigation Bar (เมนูบนสุด ใช้ร่วมกัน) */}
      <nav className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-between items-center h-14">
            
            {/* Back to Home */}
            <Link href="/" className="text-slate-400 hover:text-white text-xs flex items-center gap-1">
              ← <span className="hidden sm:inline">หน้ารวม</span>
            </Link>

            {/* Title / Project ID */}
            <div className="font-bold text-sm">
               Project #{id} <span className="bg-yellow-500 text-black text-[10px] px-1.5 py-0.5 rounded ml-1">ADMIN</span>
            </div>

            {/* Menu Toggle (ว่างไว้ก่อน หรือใส่ปุ่ม Setting) */}
            <div className="w-8"></div>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-between items-end text-xs font-medium pt-1">
            <NavLink href={`/manage/project/${id}`} active={pathname === `/manage/project/${id}`}>
              🏠 ภาพรวม
            </NavLink>
            <NavLink href={`/manage/project/${id}/timeline`} active={isActive('/timeline')}>
              📅 ไทม์ไลน์
            </NavLink>
            <NavLink href={`/manage/project/${id}/checklist`} active={isActive('/checklist')}>
              🏗️ เนื้องาน
            </NavLink>
            <NavLink href={`/manage/project/${id}/qc`} active={isActive('/qc')}>
              ✅ ตรวจรับ
            </NavLink>
          </div>
        </div>
      </nav>

      {/* ✅ 2. Content Area (เนื้อหาแต่ละหน้าจะโผล่ตรงนี้) */}
      <main className="max-w-md mx-auto">
        {children}
      </main>


      {/* ✅ 3. Floating Action Button (ปุ่มลอยขวาล่าง) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        
        {/* เมนูย่อย (โผล่มาตอนกดปุ่มหลัก) */}
        {isFabOpen && (
          <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-5 fade-in duration-200">
            <Link 
              href={`/manage/project/${id}/create`} 
              className="flex items-center gap-2 bg-white text-blue-700 px-4 py-2 rounded-full shadow-lg font-bold hover:bg-blue-50 border border-blue-100"
            >
              <span>📝</span> จดบันทึก (Report)
            </Link>

            <Link 
              href={`/manage/project/${id}/checklist/create`} 
              className="flex items-center gap-2 bg-white text-orange-700 px-4 py-2 rounded-full shadow-lg font-bold hover:bg-orange-50 border border-orange-100"
            >
              <span>🏗️</span> เพิ่มเนื้องาน (Topic)
            </Link>
          </div>
        )}

        {/* ปุ่มหลัก (+/x) */}
        <button 
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-3xl text-white transition-all transform hover:scale-105 active:scale-95 ${
            isFabOpen ? 'bg-slate-600 rotate-45' : 'bg-blue-600'
          }`}
        >
          +
        </button>
      </div>

    </div>
  );
}

// Component ย่อยสำหรับ Link
function NavLink({ href, active, children }: { href: string, active: boolean, children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className={`pb-3 px-2 border-b-2 transition-colors flex-1 text-center ${
        active 
          ? 'border-blue-500 text-white' 
          : 'border-transparent text-slate-400 hover:text-slate-200'
      }`}
    >
      {children}
    </Link>
  );
}