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
        
        {/* Project System */}
        <Link 
            href="/manage"
            className="group bg-white/10 p-6 rounded-3xl border border-white/5 hover:bg-blue-600 hover:border-blue-500 transition-all active:scale-95 flex flex-col items-center gap-3"
        >
            <span className="text-4xl group-hover:scale-110 transition-transform">🏗️</span>
            <span className="font-bold text-lg">ติดตามงานก่อสร้าง</span>
            <span className="text-xs text-slate-400 group-hover:text-blue-200">Projects & Progress</span>
        </Link>

        {/* Inventory (Placeholder) */}
        <Link 
            href="/inventory" // แก้ Link ตามจริงถ้ามี
            className="group bg-white/10 p-6 rounded-3xl border border-white/5 hover:bg-emerald-600 hover:border-emerald-500 transition-all active:scale-95 flex flex-col items-center gap-3"
        >
            <span className="text-4xl group-hover:scale-110 transition-transform">📦</span>
            <span className="font-bold text-lg">คลังสินค้า</span>
            <span className="text-xs text-slate-400 group-hover:text-emerald-200">Stock & Materials</span>
        </Link>

        {/* Surveyor (Placeholder) */}
        <Link 
            href="/surveyor" // แก้ Link ตามจริงถ้ามี
            className="group bg-white/10 p-6 rounded-3xl border border-white/5 hover:bg-amber-600 hover:border-amber-500 transition-all active:scale-95 flex flex-col items-center gap-3"
        >
            <span className="text-4xl group-hover:scale-110 transition-transform">📐</span>
            <span className="font-bold text-lg">สำรวจหน้างาน</span>
            <span className="text-xs text-slate-400 group-hover:text-amber-200">Survey Tools</span>
        </Link>

      </div>
    </div>
  );
}