// app/page.tsx
import Link from "next/link";

export default function HomeHub() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white space-y-8">
      
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Siriwong Portal
        </h1>
        <p className="text-slate-400">เลือกระบบที่ต้องการใช้งาน</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
        
        {/* 1. Project System (งานก่อสร้าง -> Active) */}
        <Link 
            href="/manage?status=active"
            className="group bg-white/10 p-6 rounded-3xl border border-white/5 hover:bg-blue-600 hover:border-blue-500 transition-all active:scale-95 flex flex-col items-center gap-3"
        >
            <span className="text-4xl group-hover:scale-110 transition-transform">🏗️</span>
            <span className="font-bold text-lg">ติดตามงานก่อสร้าง</span>
            <span className="text-xs text-slate-400 group-hover:text-blue-200">Projects & Progress</span>
        </Link>

        {/* 2. Daily Schedule */}
        <Link 
            href="/manage/schedule"
            className="group bg-white/10 p-6 rounded-3xl border border-white/5 hover:bg-violet-600 hover:border-violet-500 transition-all active:scale-95 flex flex-col items-center gap-3"
        >
            <span className="text-4xl group-hover:scale-110 transition-transform">📅</span>
            <span className="font-bold text-lg">ตารางงานของฉัน</span>
            <span className="text-xs text-slate-400 group-hover:text-violet-200">Daily Activity Log</span>
        </Link>

        {/* 3. Inventory */}
        <Link 
            href="/inventory" 
            className="group bg-white/10 p-6 rounded-3xl border border-white/5 hover:bg-emerald-600 hover:border-emerald-500 transition-all active:scale-95 flex flex-col items-center gap-3"
        >
            <span className="text-4xl group-hover:scale-110 transition-transform">📦</span>
            <span className="font-bold text-lg">คลังสินค้า</span>
            <span className="text-xs text-slate-400 group-hover:text-emerald-200">Stock & Materials</span>
        </Link>

        {/* 4. Surveyor (แก้ไขแล้ว: ชี้ไปที่ manage พร้อมตัวกรอง survey) */}
        <Link 
            href="/manage?status=survey" 
            className="group bg-white/10 p-6 rounded-3xl border border-white/5 hover:bg-purple-600 hover:border-purple-500 transition-all active:scale-95 flex flex-col items-center gap-3"
        >
            <span className="text-4xl group-hover:scale-110 transition-transform">📐</span>
            <span className="font-bold text-lg">สำรวจหน้างาน</span>
            <span className="text-xs text-slate-400 group-hover:text-purple-200">Survey Tools</span>
        </Link>

      </div>
    </div>
  );
}