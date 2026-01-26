"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { fetchProjectJobs } from "@/services/api"; // ✅ เรียกใช้ฟังก์ชันใหม่ที่ดึงข้อมูลผ่าน Project ID

export default function ProjectDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // ✅ เปลี่ยนลอจิก: ดึงข้อมูล Job ทั้งหมดที่ผูกกับ Project นี้
        const data = await fetchProjectJobs(projectId);
        setProject(data);
      } catch (error) {
        console.error("Error loading project jobs:", error);
      } finally {
        setLoading(false);
      }
    };
    if (projectId) loadData();
  }, [projectId]);

  if (loading) return <div className="p-10 text-center italic text-slate-500">กำลังดึงข้อมูลโครงการ...</div>;

  // รายการ Jobs ทั้งหมดที่มีอยู่จริงในโครงการนี้ (เช่น งานโรงจอดรถ ID 43)
  const jobs = project?.jobs || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <header className="bg-white p-6 border-b sticky top-0 z-20 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">{project?.name || "โครงการ"}</h1>
        <p className="text-xs text-slate-400 mt-1">รายการหมวดงานทั้งหมดในโครงการนี้</p>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {jobs.length === 0 ? (
          <div className="text-center py-20 text-slate-400 italic bg-white rounded-[40px] border-2 border-dashed">
            ยังไม่มีหมวดงานในโครงการนี้
          </div>
        ) : (
          jobs.map((job: any) => (
            <div key={job.id} className="bg-white p-6 rounded-[40px] shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-slate-800 text-lg leading-tight">
                  {job.title || "หมวดงานยังไม่ได้ตั้งชื่อ"} 
                </h2>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  {job.progress || 0}%
                </span>
              </div>
              
              {/* ✅ ลิงก์ไปยังหน้าแสดงรายการงานย่อย (Job Detail) ที่ถูกต้อง */}
              <Link 
                href={`/manage/project/${projectId}/job/${job.documentId || job.id}`}
                className="block w-full bg-slate-900 text-white text-center py-4 rounded-2xl text-xs font-bold shadow-lg active:scale-95 transition-all"
              >
                ดูรายการงานย่อย ({job.job_tasks?.length || 0} รายการ)
              </Link>
            </div>
          ))
        )}
      </main>
    </div>
  );
}