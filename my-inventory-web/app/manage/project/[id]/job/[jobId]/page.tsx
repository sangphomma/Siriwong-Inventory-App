"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { fetchJobDetailsById } from "@/services/api";

export default function JobDetailPage({ params }: { params: Promise<{ id: string, jobId: string }> }) {
  // 1. คลายค่า params ออกมาใช้งาน
  const { id, jobId } = use(params); 
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 2. ดึงข้อมูล Job เมื่อ jobId เปลี่ยนแปลง
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchJobDetailsById(jobId);
        setJob(data);
      } catch (error) {
        console.error("Error loading job:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [jobId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 italic text-slate-500">
      กำลังดึงข้อมูลงานย่อย...
    </div>
  );

  if (!job) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-red-500 font-bold">
      ❌ ไม่พบข้อมูลหมวดงานนี้ (ID: {jobId})
    </div>
  );

  // ดึงรายการ Task จาก Job
  const tasks = job.job_tasks || [];

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Header Bar */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <Link href={`/manage/project/${id}`} className="text-slate-400 hover:text-slate-600 text-xl p-2 transition-colors">
          ←
        </Link>
        <h1 className="font-bold text-lg text-slate-800 line-clamp-1">
          {job.title || "หมวดงาน"}
        </h1>
      </div>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* รายการงานย่อย */}
        {tasks.length === 0 ? (
          <div className="text-center py-20 text-slate-400 bg-white rounded-[32px] border-2 border-dashed">
            ยังไม่มีรายการงานย่อยในหมวดนี้
          </div>
        ) : (
          tasks.map((task: any) => (
            <div key={task.id} className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg leading-tight">{task.task_name}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    เป้าหมาย: {task.quantity} {task.unit}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-xl text-[10px] font-bold ${
                  task.job_status === 'Done' ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {task.job_status || 'Pending'}
                </div>
              </div>

              {/* ปุ่ม Link ไปยังหน้า Task Log (Feed) */}
              <Link 
                href={`/manage/project/${id}/job/${jobId}/task/${task.documentId}`}
                className="block w-full bg-slate-900 text-white text-center py-3.5 rounded-2xl text-xs font-bold shadow-lg shadow-slate-200 active:scale-95 transition-all"
              >
                📸 บันทึกและดู Log งาน ({task.task_logs?.length || 0})
              </Link>
            </div>
          ))
        )}
      </main>
    </div>
  );
}