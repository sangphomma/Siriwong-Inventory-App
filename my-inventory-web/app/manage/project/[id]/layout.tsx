'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react';

export default function AdminProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      
      {/* Top Navigation Bar */}
      <nav className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-between items-center h-14">
            
            {/* ✅ แก้ไข: Back กลับไปที่หน้ารายการโครงการ (Project List) */}
            <Link href="/manage" className="text-slate-400 hover:text-white text-xs flex items-center gap-1">
              ← <span className="hidden sm:inline">หน้ารายการ</span>
            </Link>

            {/* Title / Project ID */}
            <div className="font-bold text-sm">
               Project <span className="font-mono text-slate-400">#{id.slice(0,4)}...</span> 
               <span className="bg-yellow-500 text-black text-[10px] px-1.5 py-0.5 rounded ml-2 font-bold">ADMIN</span>
            </div>

            {/* Menu Toggle (Placeholder) */}
            <div className="w-8"></div>
          </div>
        </div>
      </nav>

      {/* Content Area */}
      <main className="max-w-md mx-auto">
        {children}
      </main>

    </div>
  );
}