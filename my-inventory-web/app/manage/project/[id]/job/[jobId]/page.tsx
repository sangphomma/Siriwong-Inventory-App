// app/manage/project/[id]/job/[jobId]/page.tsx
"use client";

import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { fetchJobDetailsById, createJobTask, updateJobTask, deleteJobTask } from "@/services/api";
import { useAuth } from "@/app/context/AuthContext";

export default function JobDetailsPage({ params }: { params: Promise<{ id: string, jobId: string }> }) {
  const { id: projectId, jobId } = use(params);
  const { user } = useAuth();
  
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTask, setNewTask] = useState({ name: "", qty: 1, unit: "จุด" });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchJobDetailsById(jobId);
      setJob(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { if (jobId) loadData(); }, [jobId]);

  // ✅ 1. Sort รายการ Task ตามชื่อแบบ numeric (1., 2., 10.)
  const sortedTasks = useMemo(() => {
    if (!job?.job_tasks) return [];
    return [...job.job_tasks].sort((a: any, b: any) => 
      (a.task_name || "").localeCompare((b.task_name || ""), 'th', { numeric: true })
    );
  }, [job?.job_tasks]);

  // ✅ 2. คำนวณ Progress แบบ Real-time Average
  const averageProgress = useMemo(() => {
    if (!job?.job_tasks || job.job_tasks.length === 0) return 0;
    const total = job.job_tasks.reduce((sum: number, task: any) => sum + (task.progress || 0), 0);
    return Math.round(total / job.job_tasks.length);
  }, [job?.job_tasks]);

  const handleAddTask = async (e: any) => {
    e.preventDefault();
    await createJobTask(newTask.name, job.documentId, newTask.qty, newTask.unit);
    setIsAddOpen(false);
    loadData();
  };

  if (loading && !job) return <div className="p-10 text-center text-slate-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-slate-900 p-6 sticky top-0 z-10 shadow-lg rounded-b-[2rem]">
        <div className="flex items-center gap-3">
            <Link href={`/manage/project/${projectId}`} className="text-white/60 text-2xl">←</Link>
            <div className="flex-1">
                <h1 className="font-bold text-white text-lg truncate pr-10">{job?.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        {/* Real-time average progress */}
                        <div className="h-full bg-blue-500" style={{ width: `${averageProgress}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-blue-400">{averageProgress}%</span>
                </div>
            </div>
        </div>
      </div>

      <main className="p-4 space-y-3 max-w-lg mx-auto">
        {sortedTasks.map((task: any) => (
          <Link 
            key={task.id} 
            href={`/manage/project/${projectId}/job/${jobId}/task/${task.documentId}`}
            className="block bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-slate-800 text-sm">{task.task_name}</h4>
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{task.progress || 0}%</span>
            </div>
            <p className="text-[10px] text-slate-400">เป้าหมาย: {task.quantity} {task.unit}</p>
            <div className="h-1.5 w-full bg-slate-100 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${task.progress || 0}%` }}></div>
            </div>
          </Link>
        ))}
      </main>

      <button onClick={() => setIsAddOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl text-3xl">+</button>

      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center p-4 backdrop-blur-sm">
          <form onSubmit={handleAddTask} className="bg-white w-full max-w-sm mx-auto rounded-3xl p-6 space-y-4">
            <h3 className="font-bold">➕ เพิ่มรายการงาน</h3>
            <input className="w-full p-3 bg-slate-50 border rounded-xl outline-none" placeholder="ชื่อรายการ (เช่น 1.งานเสา)" value={newTask.name} onChange={e => setNewTask({...newTask, name: e.target.value})} autoFocus />
            <div className="flex gap-2">
                <input type="number" className="w-1/2 p-3 bg-slate-50 border rounded-xl outline-none" placeholder="จำนวน" value={newTask.qty} onChange={e => setNewTask({...newTask, qty: Number(e.target.value)})} />
                <input className="w-1/2 p-3 bg-slate-50 border rounded-xl outline-none" placeholder="หน่วย" value={newTask.unit} onChange={e => setNewTask({...newTask, unit: e.target.value})} />
            </div>
            <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl">ยกเลิก</button>
                <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-xl">เพิ่มงาน</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}