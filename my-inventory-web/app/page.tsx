"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllProjects } from "@/services/api"; //

export default function HomePage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await getAllProjects(); //
        setProjects(data);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-slate-500 animate-pulse">กำลังโหลดข้อมูลโครงการ...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* Header Section */}
      <header className="bg-white border-b border-slate-200 px-6 py-8">
        <div className="max-w-5xl mx-auto flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Siriwong Inventory</h1>
            <p className="text-slate-500 mt-1">ระบบบริหารงานก่อสร้างและบันทึกงานหน้างาน (Task Logbook)</p>
          </div>
          <div className="hidden md:block">
            <span className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-100">
              System Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6">
        
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          {/* ใช้ ?. เพื่อบอกว่า "ถ้ามีของค่อยนับ ถ้าไม่มีให้เป็น 0" */}
🏗️ โครงการปัจจุบัน ({projects?.length || 0})
          </h2>
          <Link 
            href="/manage/project" 
            className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            เมนูจัดการ Admin →
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 mb-2">ยังไม่มีโครงการในระบบ</p>
            <p className="text-xs text-slate-300">กรุณาเพิ่มโครงการใหม่ผ่านหน้า Admin</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => (
  <div 
    key={project.id} 
    className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="flex flex-col gap-1">
        {/* ✅ แก้ไขจุดนี้: เรียก project.name แทน project.attributes.name */}
        <h3 className="font-bold text-xl text-slate-800 group-hover:text-blue-600 transition-colors">
          {project.name || project.attributes?.name || "โครงการไม่มีชื่อ"}
        </h3>
        {/* ✅ แก้ไขจุดนี้: เรียก project.location แทน project.attributes.location */}
        <p className="text-sm text-slate-500 flex items-center gap-1">
          📍 {project.location || project.attributes?.location || 'ไม่ระบุสถานที่'}
        </p>
      </div>
      <span className="bg-green-50 text-green-600 text-[10px] font-black px-2 py-1 rounded-md uppercase border border-green-100">
        Active
      </span>
    </div>

    {/* Progress Bar */}
    <div className="mt-6 mb-8">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-slate-400 font-medium">Progress</span>
        {/* ✅ แก้ไขจุดนี้: เรียก project.overall_progress */}
        <span className="text-slate-800 font-bold">{project.overall_progress || project.attributes?.overall_progress || 0}%</span>
      </div>
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div 
          className="bg-blue-600 h-full rounded-full transition-all duration-1000"
          style={{ width: `${project.overall_progress || project.attributes?.overall_progress || 0}%` }}
        ></div>
      </div>
    </div>

    <div className="space-y-3">
      <Link 
        href={`/manage/project/${project.id}`} 
        className="block w-full bg-slate-900 text-white text-center py-3.5 rounded-2xl text-sm font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-200"
      >
        🚀 จัดการโครงการ (Admin)
      </Link>
    </div>
    
    <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-400 font-medium italic">
      <span>#{project.id}</span>
      {/* ✅ แก้ไขจุดนี้: เรียก project.updatedAt */}
      <span>อัปเดตล่าสุด: {new Date(project.updatedAt || project.attributes?.updatedAt).toLocaleDateString('th-TH')}</span>
    </div>
  </div>
))}
          </div>
        )}
      </main>
    </div>
  );
}