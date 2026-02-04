// app/manage/project/[id]/page.tsx
"use client";

import { useEffect, useState, use, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { STRAPI_URL } from "@/services/config";
import { useAuth } from "@/app/context/AuthContext"; 
import { 
  fetchProjectJobs, 
  createJob, 
  updateJob, 
  deleteJob,
  getProjectMembers,
  addProjectMember,
  updateProjectMember,
  deleteProjectMember,
  getAllUsers,
  fetchProjectLogs 
} from "@/services/api"; 

// --- Helper Functions ---
const getUserColor = (name: string) => {
    if (!name) return { bg: "bg-slate-100", text: "text-slate-600", avatar: "bg-slate-500", border: "border-slate-300", glow: "ring-slate-200 shadow-slate-300" };
    const themes = [
      { bg: "bg-blue-50", text: "text-blue-700", avatar: "bg-blue-500", border: "border-blue-200", glow: "ring-blue-200 shadow-blue-400/50" },
      { bg: "bg-emerald-50", text: "text-emerald-700", avatar: "bg-emerald-500", border: "border-emerald-200", glow: "ring-emerald-200 shadow-emerald-400/50" },
      { bg: "bg-amber-50", text: "text-amber-700", avatar: "bg-amber-500", border: "border-amber-200", glow: "ring-amber-200 shadow-amber-400/50" },
      { bg: "bg-violet-50", text: "text-violet-700", avatar: "bg-violet-500", border: "border-violet-200", glow: "ring-violet-200 shadow-violet-400/50" },
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return themes[sum % themes.length];
};

const getDayTheme = (index: number) => {
    const themes = [
        { dot: "bg-blue-500", border: "border-blue-200", bg: "bg-blue-50/50", text: "text-blue-700" },
        { dot: "bg-rose-500", border: "border-rose-200", bg: "bg-rose-50/50", text: "text-rose-700" },
    ];
    return themes[index % themes.length];
};

const Icons = {
  AddUser: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>),
  Trash: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>),
  Edit: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>),
};

export default function ProjectDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { user } = useAuth();
  
  const [project, setProject] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteLogs, setSiteLogs] = useState<any[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [memberForm, setMemberForm] = useState({ userId: "", role: "", responsibility: "", start_date: "", end_date: "" });

  const isAdmin = user?.role?.name === 'Admin' || user?.role?.type === 'admin';
  const isOwner = !!user && !!project?.creator && project.creator.id === user.id;
  const canManage = !!user && (isAdmin || isOwner);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const projData = await fetchProjectJobs(projectId);
      setProject(projData);
      try { const membersData = await getProjectMembers(projectId); setMembers(membersData); } catch (err) { setMembers([]); }
      if (user) { try { const usersData = await getAllUsers(); setUsers(usersData); } catch (e) {} }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const loadLogs = async (page: number, reset: boolean = false) => {
      try {
          setLoadingLogs(true);
          const res = await fetchProjectLogs(projectId, page, 5); 
          if (reset) setSiteLogs(res.data); else setSiteLogs(prev => [...prev, ...res.data]);
          setHasMoreLogs(res.meta?.pagination?.page < res.meta?.pagination?.pageCount);
      } catch (error) { console.error(error); } finally { setLoadingLogs(false); }
  };

  useEffect(() => { if (projectId) { loadProjectData(); loadLogs(1, true); } }, [projectId]);

  const lastLogElementRef = useCallback((node: any) => {
    if (loadingLogs) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMoreLogs) { setLogPage(prev => { loadLogs(prev + 1); return prev + 1; }); }
    });
    if (node) observer.current.observe(node);
  }, [loadingLogs, hasMoreLogs]);

  const groupedLogs = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    siteLogs.forEach((log) => {
        const dateObj = new Date(log.action_date || log.createdAt);
        const dateKey = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(log);
    });
    return Object.entries(groups).sort((a, b) => {
        const dateA = new Date(a[1][0].action_date || a[1][0].createdAt).getTime();
        const dateB = new Date(b[1][0].action_date || b[1][0].createdAt).getTime();
        return dateB - dateA;
    });
  }, [siteLogs]);

  const handleCreateJob = async (e: React.FormEvent) => { e.preventDefault(); try { setSubmitting(true); await createJob(newJobTitle, project.documentId); setNewJobTitle(""); setIsCreateOpen(false); await loadProjectData(); } catch (error) { alert("ล้มเหลว"); } finally { setSubmitting(false); } };
  const handleDeleteJob = async (e: any, id: string, title: string) => { e.stopPropagation(); if (confirm(`ลบ ${title}?`)) { await deleteJob(id); loadProjectData(); } };
  const handleUpdateJob = async (e: React.FormEvent) => { e.preventDefault(); try { await updateJob(editingJob.documentId, { title: editingJob.title }); setIsEditOpen(false); await loadProjectData(); } catch (error) { alert("แก้ไขไม่สำเร็จ"); } };
  const handleSaveMember = async (e: any) => { e.preventDefault(); try { if (editingMember) await updateProjectMember(editingMember.documentId, memberForm); else await addProjectMember({ projectSiteId: projectId, ...memberForm }); setIsMemberModalOpen(false); loadProjectData(); } catch (err) { alert("ล้มเหลว"); } };
  const handleDeleteMember = async (id: string) => { if(confirm("ลบสมาชิก?")) { await deleteProjectMember(id); loadProjectData(); } };

  if (loading && !project) return <div className="h-screen flex items-center justify-center text-slate-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans relative">
      <div className="bg-slate-900 text-white rounded-b-[2.5rem] p-6 pb-14 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
            <Link href="/manage" className="text-slate-400 text-xs mb-2 block">← กลับหน้ารวม</Link>
            <h1 className="text-2xl font-bold">{project?.name}</h1>
            <p className="text-sm text-slate-300 mt-1">📍 {project?.location || "ไม่ระบุที่ตั้ง"}</p>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 -mt-8 relative z-20 space-y-6">
        {/* 1. Timeline ทีมงาน */}
        <section className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-slate-800 text-base">👷 Timeline ทีมงาน</h2>
                {canManage && <button onClick={() => { setEditingMember(null); setMemberForm({ userId: "", role: "", responsibility: "", start_date: "", end_date: "" }); setIsMemberModalOpen(true); }} className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-bold hover:bg-blue-100 flex items-center gap-1 active:scale-95 transition"><Icons.AddUser /> เพิ่ม/มอบหมาย</button>}
            </div>
            <div className="relative pl-4 border-l-2 border-dashed border-slate-200 space-y-8">
                {members.map((m: any) => {
                    const theme = getUserColor(m.user?.username || "");
                    const isActive = !m.end_date || new Date(m.end_date) >= new Date();
                    return (
                        <div key={m.id} className="relative pl-8">
                            <div className={`absolute -left-[25px] top-0 w-5 h-5 rounded-full border-4 border-white shadow-sm z-10 ${isActive ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                            <div className="flex items-center gap-2 mb-2 -mt-1">
                                <span className={`text-[10px] font-bold ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{new Date(m.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                                {isActive && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md font-bold border border-green-200">Active Now</span>}
                            </div>
                            <div className={`relative group p-4 rounded-2xl border shadow-sm flex items-start gap-3 transition-all hover:shadow-md ${isActive ? `bg-white ${theme.border}` : 'bg-slate-50 border-slate-200 opacity-70'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden ${theme.avatar} ring-[3px] ring-offset-2 ${theme.glow}`}>
                                    {m.user?.avatar?.url ? <img src={m.user.avatar.url.startsWith('http') ? m.user.avatar.url : `${STRAPI_URL}${m.user.avatar.url}`} className="w-full h-full object-cover" /> : <span>{m.user?.username?.charAt(0).toUpperCase()}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <div><p className={`font-bold text-sm ${isActive ? theme.text : 'text-slate-600'}`}>{m.user?.username || "Unknown"}</p><p className="text-[10px] text-slate-500">{m.role_in_project}</p></div>
                                        {canManage && (<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition"><button onClick={() => {setEditingMember(m); setMemberForm({userId: m.user.id, role: m.role_in_project, responsibility: m.responsibility, start_date: m.start_date, end_date: m.end_date}); setIsMemberModalOpen(true);}} className="text-slate-300 hover:text-blue-500"><Icons.Edit /></button><button onClick={() => handleDeleteMember(m.documentId)} className="text-slate-300 hover:text-red-500"><Icons.Trash /></button></div>)}
                                    </div>
                                    {m.responsibility && <p className="mt-2 text-[10px] text-slate-600 italic">"{m.responsibility}"</p>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>

        {/* 2. รายการหมวดงาน (ปรับให้ตัวเลข Progress ใหญ่ขึ้นชัดเจน) */}
        <section className="space-y-4">
            <h2 className="font-bold text-slate-800 px-2">รายการหมวดงาน</h2>
            {project?.jobs?.map((job: any) => {
                // ✅ คำนวณค่าเฉลี่ย Progress จาก Task ลูกๆ ของ Job นี้
                const avgProg = job.job_tasks && job.job_tasks.length > 0 
                   ? Math.round(job.job_tasks.reduce((s:number, t:any)=> s+(t.progress||0),0) / job.job_tasks.length) 
                   : 0;

                return (
                <div key={job.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 relative group">
                    <div className="mb-4 pr-16">
                        <h3 className="font-bold text-slate-800 truncate">{job.title}</h3>
                        <div className="flex items-center gap-3 mt-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${avgProg}%` }}></div>
                            </div>
                            {/* ✅ ปรับตัวเลข Progress ให้ตัวใหญ่ชัดเจน (lg font-black) */}
                            <span className="text-lg font-black text-blue-600 drop-shadow-sm">{avgProg}%</span>
                        </div>
                    </div>
                    {canManage && <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition"><button onClick={() => {setEditingJob(job); setIsEditOpen(true);}} className="p-2 text-slate-300 hover:text-blue-500">✎</button><button onClick={(e) => handleDeleteJob(e, job.documentId, job.title)} className="p-2 text-slate-300 hover:text-red-500">🗑</button></div>}
                    <Link href={`/manage/project/${projectId}/job/${job.documentId}`} className="flex items-center justify-between w-full bg-white border-2 border-red-100 hover:border-red-400 text-red-600 px-5 py-4 rounded-2xl text-sm font-bold transition-all shadow-sm active:scale-[0.97] group">
                        <span className="flex items-center gap-2">🔍 ดูรายการย่อย ({job.job_tasks?.length || 0})</span>
                        <span className="text-xl">→</span>
                    </Link>
                </div>
              );
            })}
        </section>

        {/* 3. Site Diary (เพิ่มแสดง Progress ของ Task นั้นๆ) */}
        <section className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100">
            <h2 className="font-bold text-slate-800 mb-6 flex items-center gap-2">📝 Site Diary <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">Live</span></h2>
            <div className="relative pl-2 space-y-8">
                {groupedLogs.map(([dateKey, logs]) => (
                    <div key={dateKey}>
                        <div className="flex items-center gap-2 mb-4"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-xs font-bold text-slate-600">{dateKey}</span></div>
                        <div className="space-y-3 ml-4">
                            {logs.map((log: any) => {
                                const isDefect = log.Log_Type === 'Defect';
                                const hasMedia = log.Media && log.Media.length > 0;
                                // ✅ ดึง Progress ปัจจุบันของ Task นี้ (ถ้ามี populate มาให้)
                                const taskProgress = log.job_task?.progress || 0;

                                return (
                                    <Link key={log.documentId} href={`/manage/project/${projectId}/job/${log.jobId}/task/${log.taskId}`} className={`block p-4 rounded-2xl border transition-all ${isDefect ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white border-slate-100 hover:shadow-md'}`}>
                                        <div className="flex gap-3">
                                            {hasMedia ? (
                                                <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0 overflow-hidden border border-slate-100">
                                                    <img src={log.Media[0].url.startsWith('http') ? log.Media[0].url : `${STRAPI_URL}${log.Media[0].url}`} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg ${isDefect ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-slate-500'}`}>
                                                    {isDefect ? "🚨" : (log.Log_Type === 'Progress' ? "📈" : "📝")}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                   {/* ✅ เพิ่มสถานะ Progress ปัจจุบัน (เช่น: 50%) ต่อท้ายชื่อ Task */}
                                                   <h4 className={`text-xs font-bold truncate ${isDefect ? 'text-red-700' : 'text-slate-700'}`}>
                                                      {log.taskName} <span className="text-[10px] text-blue-500 font-normal">({log.progress_percentage || 0}%)</span>
                                                   </h4>
                                                   <span className="text-[9px] text-slate-400">{new Date(log.action_date || log.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className={`text-[10px] truncate mt-1 ${isDefect ? 'text-red-600 font-medium' : 'text-slate-500'}`}>{log.Description}</p>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </section>
      </main>

      {/* Floating Add Button */}
      {canManage && <button onClick={() => {setNewJobTitle(""); setIsCreateOpen(true);}} className="fixed bottom-8 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl flex items-center justify-center text-3xl z-[999]">+</button>}
      
      {/* Create Job Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <h3 className="font-bold text-lg mb-4 text-slate-800">🏗️ เพิ่มหมวดงานใหม่</h3>
            <form onSubmit={handleCreateJob} className="space-y-4">
              <input type="text" placeholder="ชื่อหมวดงาน" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} autoFocus />
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">ยกเลิก</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">สร้าง</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditOpen && editingJob && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 className="font-bold text-lg mb-4 text-slate-800">✏️ แก้ไขหมวดงาน</h3>
            <form onSubmit={handleUpdateJob} className="space-y-4">
              <input type="text" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={editingJob.title} onChange={e => setEditingJob({...editingJob, title: e.target.value})} />
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">ยกเลิก</button>
                <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMemberModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800">{editingMember ? "✏️ แก้ไขข้อมูล" : "👷 มอบหมายงาน"}</h3>
              <button onClick={() => setIsMemberModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSaveMember} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1">เลือกพนักงาน</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none font-bold" value={memberForm.userId} onChange={e => setMemberForm({...memberForm, userId: e.target.value})} required>
                  <option value="" disabled>-- เลือกรายชื่อ --</option>
                  {users.map(u => (<option key={u.id} value={u.id}>{u.username} ({u.position || "ไม่ระบุ"})</option>))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1">หน้าที่</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none font-bold" value={memberForm.role} onChange={e => setMemberForm({...memberForm, role: e.target.value})} required />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 ml-1">เริ่ม</label>
                  <input type="date" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none font-bold" value={memberForm.start_date} onChange={e => setMemberForm({...memberForm, start_date: e.target.value})} required />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 ml-1">ถึง (ถ้ามี)</label>
                  <input type="date" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none font-bold" value={memberForm.end_date} onChange={e => setMemberForm({...memberForm, end_date: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1">รายละเอียด</label>
                <textarea rows={3} className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none resize-none font-bold" value={memberForm.responsibility} onChange={e => setMemberForm({...memberForm, responsibility: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg mt-2">{editingMember ? "บันทึกการแก้ไข" : "บันทึก"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}