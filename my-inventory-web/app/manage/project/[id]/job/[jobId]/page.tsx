// app/manage/project/[id]/job/[jobId]/page.tsx
"use client";

import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { 
  fetchJobDetailsById, 
  createJobTask, 
  updateJobTask, 
  deleteJobTask,
  fetchDictionary,
  createDictionaryWord
} from "@/services/api";
import { useAuth } from "@/app/context/AuthContext";
import { SmartInput } from "@/app/components/SmartInput";

// ==========================================
// 🛠️ 1. สร้างพิมพ์เขียว (Interface) เพื่อกำจัด any
// ==========================================
interface JobTask {
  id: number;
  documentId: string;
  task_name: string;
  progress: number;
  quantity: number;
  unit: string;
}

interface JobData {
  documentId: string;
  title: string;
  job_tasks: JobTask[];
}

export default function JobDetailsPage({ params }: { params: Promise<{ id: string, jobId: string }> }) {
  const { id: projectId, jobId } = use(params);
  const { user } = useAuth();
  
  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // States for Dictionary (คำศัพท์แนะนำ)
  const [taskNameSuggestions, setTaskNameSuggestions] = useState<string[]>([]);
  const [unitSuggestions, setUnitSuggestions] = useState<string[]>([]);
  
  // States for Add/Edit
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTask, setNewTask] = useState({ name: "", qty: 1, unit: "จุด" });
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTask, setEditTask] = useState({ documentId: "", name: "", qty: 1, unit: "จุด" });

  // ==========================================
  // 🔄 2. โหลดข้อมูล (Data Fetching)
  // ==========================================
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchJobDetailsById(jobId);
      setJob(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { 
    if (jobId) loadData(); 
  }, [jobId]);

  // โหลดคำศัพท์จาก Strapi เมื่อเปิดหน้าเว็บ
  useEffect(() => {
    const loadDictionaries = async () => {
      const names = await fetchDictionary("JobTask_Name"); // หมวดชื่องาน
      const units = await fetchDictionary("JobTask_Unit"); // หมวดหน่วย
      setTaskNameSuggestions(names);
      setUnitSuggestions(units);
    };
    loadDictionaries();
  }, []);

  // ==========================================
  // 🧮 3. คำนวณต่างๆ
  // ==========================================
  const sortedTasks = useMemo(() => {
    if (!job?.job_tasks) return [];
    return [...job.job_tasks].sort((a: JobTask, b: JobTask) => 
      (a.task_name || "").localeCompare((b.task_name || ""), 'th', { numeric: true })
    );
  }, [job?.job_tasks]);

  const averageProgress = useMemo(() => {
    if (!job?.job_tasks || job.job_tasks.length === 0) return 0;
    const total = job.job_tasks.reduce((sum: number, task: JobTask) => sum + (task.progress || 0), 0);
    return Math.round(total / job.job_tasks.length);
  }, [job?.job_tasks]);

  // ==========================================
  // ⚡ 4. Actions & Submit (เพิ่มระบบแอบบันทึกคำ)
  // ==========================================
  
  // ฟังก์ชันช่วยบันทึกคำใหม่
  const autoSaveDictionary = async (name: string, unit: string) => {
    const nameTrimmed = name.trim();
    if (nameTrimmed && nameTrimmed.length <= 50 && !taskNameSuggestions.includes(nameTrimmed)) {
        await createDictionaryWord(nameTrimmed, "JobTask_Name");
        setTaskNameSuggestions(prev => [...prev, nameTrimmed]);
    }
    const unitTrimmed = unit.trim();
    if (unitTrimmed && unitTrimmed.length <= 20 && !unitSuggestions.includes(unitTrimmed)) {
        await createDictionaryWord(unitTrimmed, "JobTask_Unit");
        setUnitSuggestions(prev => [...prev, unitTrimmed]);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await createJobTask(newTask.name, job!.documentId, newTask.qty, newTask.unit);
    await autoSaveDictionary(newTask.name, newTask.unit); // แอบบันทึกคำศัพท์

    setIsAddOpen(false);
    setNewTask({ name: "", qty: 1, unit: "จุด" }); // Reset form
    loadData();
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateJobTask(editTask.documentId, {
        task_name: editTask.name,
        quantity: editTask.qty,
        unit: editTask.unit
    });
    await autoSaveDictionary(editTask.name, editTask.unit); // แอบบันทึกคำศัพท์

    setIsEditOpen(false);
    loadData();
  };

  const handleDeleteTask = async (taskDocId: string) => {
    if (!window.confirm("คุณต้องการลบรายการงานนี้ใช่หรือไม่?")) return;
    try {
      await deleteJobTask(taskDocId);
      loadData();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("ไม่สามารถลบรายการได้");
    }
  };

  const openEditModal = (task: JobTask) => {
    setEditTask({
        documentId: task.documentId,
        name: task.task_name,
        qty: task.quantity,
        unit: task.unit
    });
    setIsEditOpen(true);
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
                        <div className="h-full bg-blue-500" style={{ width: `${averageProgress}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-blue-400">{averageProgress}%</span>
                </div>
            </div>
        </div>
      </div>

      <main className="p-4 space-y-3 max-w-lg mx-auto">
        {sortedTasks.map((task: JobTask) => (
          <div key={task.id} className="relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
            <Link 
              href={`/manage/project/${projectId}/job/${jobId}/task/${task.documentId}`}
              className="block p-5 active:bg-slate-50"
            >
              <div className="flex justify-between items-start mb-2 pr-16">
                  <h4 className="font-bold text-slate-800 text-sm">{task.task_name}</h4>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{task.progress || 0}%</span>
              </div>
              <p className="text-[10px] text-slate-400">เป้าหมาย: {task.quantity} {task.unit}</p>
              <div className="h-1.5 w-full bg-slate-100 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${task.progress || 0}%` }}></div>
              </div>
            </Link>

            <div className="absolute top-4 right-4 flex gap-1">
                <button 
                  onClick={(e) => { e.preventDefault(); openEditModal(task); }} 
                  className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  ✏️
                </button>
                <button 
                  onClick={(e) => { e.preventDefault(); handleDeleteTask(task.documentId); }} 
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  🗑️
                </button>
            </div>
          </div>
        ))}
      </main>

      <button onClick={() => setIsAddOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl text-3xl">+</button>

      {/* ========================================== */}
      {/* 🚀 Modal เพิ่มงาน (ใช้ SmartInput) */}
      {/* ========================================== */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center p-4 backdrop-blur-sm">
          <form onSubmit={handleAddTask} className="bg-white w-full max-w-sm mx-auto rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-800">➕ เพิ่มรายการงาน</h3>
            
            <SmartInput 
                multiline={false}
                placeholder="ชื่อรายการ (เช่น 1.งานเสาเข็ม)"
                value={newTask.name}
                onValueChange={(val) => setNewTask({...newTask, name: val})}
                suggestions={taskNameSuggestions}
            />
            
            <div className="flex gap-2 items-start mt-2">
                <input 
                  type="number" min="1" required 
                  className="w-1/3 p-4 font-medium text-slate-700 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-slate-400 shadow-sm" 
                  placeholder="จำนวน" 
                  value={newTask.qty} 
                  onChange={e => setNewTask({...newTask, qty: Number(e.target.value)})} 
                />
                <div className="w-2/3">
                    <SmartInput 
                        multiline={false}
                        placeholder="หน่วย (เช่น จุด, ตร.ม.)"
                        value={newTask.unit}
                        onValueChange={(val) => setNewTask({...newTask, unit: val})}
                        suggestions={unitSuggestions}
                    />
                </div>
            </div>

            <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium">ยกเลิก</button>
                <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-medium">เพิ่มงาน</button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================== */}
      {/* 🚀 Modal แก้ไขงาน (ใช้ SmartInput) */}
      {/* ========================================== */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center p-4 backdrop-blur-sm">
          <form onSubmit={handleEditTask} className="bg-white w-full max-w-sm mx-auto rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-800">✏️ แก้ไขรายการงาน</h3>
            
            <SmartInput 
                multiline={false}
                placeholder="ชื่อรายการ"
                value={editTask.name}
                onValueChange={(val) => setEditTask({...editTask, name: val})}
                suggestions={taskNameSuggestions}
            />

            <div className="flex gap-2 items-start mt-2">
                <input 
                  type="number" min="1" required 
                  className="w-1/3 p-4 font-medium text-slate-700 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-slate-400 shadow-sm" 
                  placeholder="จำนวน" 
                  value={editTask.qty} 
                  onChange={e => setEditTask({...editTask, qty: Number(e.target.value)})} 
                />
                <div className="w-2/3">
                    <SmartInput 
                        multiline={false}
                        placeholder="หน่วย"
                        value={editTask.unit}
                        onValueChange={(val) => setEditTask({...editTask, unit: val})}
                        suggestions={unitSuggestions}
                    />
                </div>
            </div>

            <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium">ยกเลิก</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium">บันทึก</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}