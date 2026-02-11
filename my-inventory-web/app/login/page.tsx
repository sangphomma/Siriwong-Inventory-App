// app/login/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // ✅ State สำหรับสลับการมองเห็น Password
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(identifier, password);
      // login สำเร็จจะ redirect ใน AuthContext
    } catch (err: any) {
      // แสดง Error ภาษาไทยตามที่เจอ
      setError("ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F172A] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-blue-600/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-emerald-500/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl relative z-10">
        
        {/* Logo & Title */}
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-400 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
                <span className="text-3xl">👷</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Siriwong Portal</h1>
            <p className="text-slate-400 text-sm">ระบบบริหารจัดการงานก่อสร้าง</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 tracking-wider ml-1">USERNAME / EMAIL</label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-slate-500 group-focus-within:text-blue-400 transition-colors">👤</span>
                </div>
                <input
                    type="text"
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    placeholder="ระบุชื่อผู้ใช้งาน"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                />
            </div>
          </div>

          {/* Password Input (พร้อมลูกตา) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 tracking-wider ml-1">PASSWORD</label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-slate-500 group-focus-within:text-blue-400 transition-colors">🔒</span>
                </div>
                
                <input
                    type={showPassword ? "text" : "password"} // ✅ สลับ type
                    required
                    className="w-full pl-11 pr-12 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    placeholder="ระบุรหัสผ่าน"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {/* ✅ ปุ่มลูกตา (Eye Icon) */}
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors cursor-pointer outline-none"
                >
                    {showPassword ? (
                        // Icon ตาเปิด
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                    ) : (
                        // Icon ตาปิด
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                    )}
                </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-sm p-3 rounded-lg text-center animate-pulse">
                ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        {/* ✅ ส่วนสำหรับแจ้ง User ทดสอบระบบ (ลบออกได้เมื่อจบ Phase Test) */}
        <div className="mt-6 p-4 bg-white/5 border border-dashed border-slate-600 rounded-xl text-center">
            <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">🧪 สำหรับทดสอบระบบ</p>
            <div className="flex justify-center gap-4 text-sm font-mono text-slate-300">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500">Username</span>
                    <span className="text-blue-400 font-bold bg-blue-900/20 px-2 rounded">siriwong</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500">Password</span>
                    <span className="text-emerald-400 font-bold bg-emerald-900/20 px-2 rounded">123456</span>
                </div>
            </div>
        </div>
        
        <div className="mt-6 text-center">
            <p className="text-[10px] text-slate-600">© 2026 Siriwong Karnchang. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}