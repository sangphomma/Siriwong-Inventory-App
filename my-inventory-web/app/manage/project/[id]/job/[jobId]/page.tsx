"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { fetchJobDetailsById, deleteJobTask, updateJobTask, STRAPI_URL } from "@/services/api";
import { useRouter } from "next/navigation";

export default function JobDetailPage({ params }: { params: Promise<{ id: string, jobId: string }> }) {
  const { id, jobId } = use(params); 
  const router = useRouter();
  
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // State สำหรับ Modal แก้ไข
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

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

  useEffect(() => { loadData(); }, [jobId]);

  // ฟังก์ชันลบ Task
  const handleDelete = async (e: React.MouseEvent, taskDocId: string, taskName: string) => {
    e.preventDefault(); // ป้องกันไม่ให้ Link ทำงาน
    e.stopPropagation();
    
    if(!confirm(`ต้องการลบงาน "${taskName}" ใช่หรือไม่?\n(Log ทั้งหมดจะถูกซ่อนไปด้วย)`)) return;

    try {
      setLoading(true);
      await deleteJobTask(taskDocId);
      await loadData(); // โหลดใหม่
    } catch (error) {
      alert("ลบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  // เปิด Modal แก้ไข
  const openEditModal = (e: React.MouseEvent, task: any) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingTask({ ...task }); // clone object
    setIsEditOpen(true);
  };

  // บันทึกการแก้ไข
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateJobTask(editingTask.documentId, editingTask);
      setIsEditOpen(false);
      setEditingTask(null);
      loadData();
    } catch (error) {
      alert("แก้ไขไม่สำเร็จ");
    }
  };

  if (loading && !job) return <div className="p-10 text-center text-slate-400">Loading...</div>;
  if (!job) return <div className="p-10 text-center text-red-500">Not Found</div>;

  const tasks = job.job_tasks || [];
  const totalProgress = tasks.reduce((acc: number, curr: any) => acc + (curr.progress || 0), 0);
  const avgProgress = tasks.length > 0 ? Math.round(totalProgress / tasks.length) : 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 relative">
      
      {/* Header (Dashboard Style) */}
      <div className="bg-slate-900 text-white pt-6 pb-12 px-6 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <Link href={`/manage/project/${id}`} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/30 transition">←</Link>
          <div className="flex-1 overflow-hidden">
             <div className="text-xs text-slate-300 uppercase tracking-wider">หมวดงาน</div>
             <h1 className="text-xl font-bold truncate">{job.title}</h1>
          </div>
        </div>

        {/* Overall Circle */}
        <div className="flex items-center justify-between bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
          <div>
            <div className="text-sm text-slate-300 mb-1">ความคืบหน้าหมวดนี้</div>
            <div className="text-4xl font-bold">{avgProgress}%</div>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-slate-600 flex items-center justify-center relative bg-slate-800">
             <div className="absolute inset-0 rounded-full border-4 border-blue-400 transition-all duration-1000" style={{ clipPath: `inset(${100 - avgProgress}% 0 0 0)` }}></div>
             <span className="text-[10px] text-slate-300">Overall</span>
          </div>
        </div>
      </div>

      {/* Task List */}
      <main className="px-4 -mt-6 relative z-10 space-y-4">
        {tasks.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl text-center text-slate-400 shadow-sm border border-slate-100">
            ยังไม่มีงานย่อยในหมวดนี้
          </div>
        ) : (
          tasks.map((task: any) => {
            const lastLog = task.task_logs?.[0];
            const lastImage = lastLog?.Media?.[0];

            return (
              <Link 
                key={task.id} 
                href={`/manage/project/${id}/job/${jobId}/task/${task.documentId}`}
                className="block bg-white p-4 rounded-3xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-slate-100 active:scale-[0.99] transition-all relative group"
              >
                {/* ปุ่มจัดการ (Edit / Delete) - ลอยขวาบน */}
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  <button 
                    onClick={(e) => openEditModal(e, task)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-full transition-colors"
                  >
                    ✎
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, task.documentId, task.task_name)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-full transition-colors"
                  >
                    🗑
                  </button>
                </div>

                <div className="flex gap-4 pr-16"> {/* pr-16 เพื่อหลบปุ่ม */}
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-100">
                    {lastImage ? (
                      <img 
                        src={lastImage.url.startsWith('http') ? lastImage.url : `${STRAPI_URL}${lastImage.url}`} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-xl">📋</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-base mb-1 truncate">{task.task_name}</h3>
                    <div className="text-xs text-slate-400 mb-2">
                       เป้า: {task.quantity} {task.unit} • Log: {task.task_logs?.length || 0}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${task.progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${task.progress || 0}%` }}></div>
                      </div>
                      <span className={`text-[10px] font-bold ${task.progress >= 100 ? 'text-green-600' : 'text-blue-600'}`}>{task.progress}%</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </main>

      {/* Edit Modal Popup */}
      {isEditOpen && editingTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 className="font-bold text-lg mb-4 text-slate-800">✏️ แก้ไขงานย่อย</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1">ชื่องาน</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-slate-50 text-blue-900 font-medium rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={editingTask.task_name}
                  onChange={e => setEditingTask({...editingTask, task_name: e.target.value})}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 ml-1">จำนวนเป้าหมาย</label>
                  <input 
                    type="number" 
                    className="w-full p-3 bg-slate-50 text-blue-950 font-bold rounded-xl border border-slate-200 outline-none"
                    value={editingTask.quantity}
                    onChange={e => setEditingTask({...editingTask, quantity: e.target.value})}
                  />
                </div>
                <div className="w-1/3">
                  <label className="text-xs font-bold text-slate-500 ml-1">หน่วย</label>
                  <input 
                    type="text" 
                    className="w-full p-3 text-blue-950 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                    value={editingTask.unit}
                    onChange={e => setEditingTask({...editingTask, unit: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold">ยกเลิก</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}