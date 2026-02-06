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

// ✅ Import Components ที่เราเพิ่งสร้าง
import ProjectHeader from "./components/ProjectHeader";
import ReportModal from "./components/ReportModal";

// --- Helper Functions ---
// ยังคงไว้สำหรับ Timeline Section ในหน้านี้
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

// เหลือแค่ Icon ที่จำเป็นสำหรับหน้านี้ (Edit/Trash) ส่วน Report/Map ย้ายไปแล้ว
const Icons = {
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

  // Modals & States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [memberForm, setMemberForm] = useState({ userId: "", role: "", responsibility: "", start_date: "", end_date: "" });
  
  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const isAdmin = user?.role?.name === 'Admin' || user?.role?.type === 'admin';
  const isOwner = !!user && !!project?.creator && project.creator.id === user.id;
  const canManage = !!user && (isAdmin || isOwner);

  // --- Logic เดิม: Infinite Scroll ---
  const loadLogs = async (page: number, reset: boolean = false) => {
      try {
          setLoadingLogs(true);
          const res = await fetchProjectLogs(projectId, page, 5); 
          if (reset) setSiteLogs(res.data); else setSiteLogs(prev => [...prev, ...res.data]);
          setHasMoreLogs(res.meta?.pagination?.page < res.meta?.pagination?.pageCount);
      } catch (error) { console.error(error); } finally { setLoadingLogs(false); }
  };

  const lastLogElementRef = useCallback((node: any) => {
    if (loadingLogs) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMoreLogs) {
            setLogPage(prev => {
                const next = prev + 1;
                loadLogs(next);
                return next;
            });
        }
    });
    if (node) observer.current.observe(node);
  }, [loadingLogs, hasMoreLogs, projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const [projData, membersData] = await Promise.all([fetchProjectJobs(projectId), getProjectMembers(projectId)]);
      setProject(projData); setMembers(membersData);
      if (user) { try { const u = await getAllUsers(); setUsers(u); } catch (e) {} }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { if (projectId) { loadProjectData(); loadLogs(1, true); setLogPage(1); } }, [projectId]);

  const groupedLogs = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    siteLogs.forEach((log) => {
        const dateKey = new Date(log.action_date || log.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(log);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[1][0].action_date || b[1][0].createdAt).getTime() - new Date(a[1][0].action_date || a[1][0].createdAt).getTime());
  }, [siteLogs]);

  // --- Handlers ---
  const handleCreateJob = async (e: React.FormEvent) => { e.preventDefault(); try { setSubmitting(true); await createJob(newJobTitle, project.documentId); setNewJobTitle(""); setIsCreateOpen(false); await loadProjectData(); } catch (error) { alert("ล้มเหลว"); } finally { setSubmitting(false); } };
  const handleDeleteJob = async (e: any, id: string, title: string) => { e.stopPropagation(); if (confirm(`ลบ ${title}?`)) { await deleteJob(id); loadProjectData(); } };
  const handleUpdateJob = async (e: React.FormEvent) => { e.preventDefault(); try { await updateJob(editingJob.documentId, { title: editingJob.title }); setIsEditOpen(false); await loadProjectData(); } catch (error) { alert("แก้ไขไม่สำเร็จ"); } };
  const handleSaveMember = async (e: any) => { e.preventDefault(); try { if (editingMember) await updateProjectMember(editingMember.documentId, memberForm); else await addProjectMember({ projectSiteId: projectId, ...memberForm }); setIsMemberModalOpen(false); loadProjectData(); } catch (err) { alert("ล้มเหลว"); } };
  const handleDeleteMember = async (id: string) => { if(confirm("ลบสมาชิก?")) { await deleteProjectMember(id); loadProjectData(); } };
  
  if (loading && !project) return <div className="h-screen flex items-center justify-center text-slate-400 font-bold tracking-widest uppercase text-xs">Loading Siriwong Data...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans relative">
      
      {/* ✅ 1. ใช้ Component Header ใหม่ (สะอาดตา!) */}
      <ProjectHeader 
         project={project} 
         members={members} 
         onOpenReport={() => setIsReportModalOpen(true)} 
      />

      <main className="max-w-md mx-auto px-4 -mt-8 relative z-20 space-y-6">
        
        {/* Timeline ทีมงาน */}
        <section className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8"><h2 className="font-black text-slate-800 text-base font-sans">👷 Timeline ทีมงาน</h2>{canManage && <button onClick={() => { setEditingMember(null); setMemberForm({ userId: "", role: "", responsibility: "", start_date: "", end_date: "" }); setIsMemberModalOpen(true); }} className="text-[10px] bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-black shadow-sm tracking-tight">+ เพิ่มพนักงาน</button>}</div>
            <div className="relative pl-4 border-l-2 border-dashed border-slate-100 space-y-10">
                {members.map((m: any, idx: number) => { const theme = getUserColor(m.user?.username || ""); const isActive = !m.end_date || new Date(m.end_date) >= new Date();
                    return (<div key={`${m.id}-${idx}`} className="relative pl-10"><div className={`absolute -left-[27px] top-0 w-6 h-6 rounded-full border-4 border-white shadow-md z-10 ${isActive ? 'bg-blue-500' : 'bg-slate-200'}`}></div><div className="flex items-center gap-2 mb-3 -mt-1"><span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{new Date(m.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>{isActive && <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-black border border-emerald-100 shadow-sm shadow-emerald-50">Active Now</span>}</div><div className={`relative group p-5 rounded-[2rem] border shadow-sm flex items-start gap-4 transition-all hover:shadow-lg ${isActive ? `bg-white ${theme.border}` : 'bg-slate-50 opacity-60'}`}><div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-inner shrink-0 overflow-hidden ${theme.avatar} ring-4 ring-offset-2 ${isActive ? theme.glow : ''}`}>{m.user?.avatar?.url ? <img src={m.user.avatar.url.startsWith('http') ? m.user.avatar.url : `${STRAPI_URL}${m.user.avatar.url}`} className="h-full w-full object-cover rounded-2xl" /> : <span>{m.user?.username?.charAt(0).toUpperCase()}</span>}</div><div className="flex-1 min-w-0"><div className="flex justify-between"><div><p className={`font-black text-base ${isActive ? theme.text : 'text-slate-700'}`}>{m.user?.username}</p><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{m.role_in_project}</p></div>{canManage && (<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition"><button onClick={() => {setEditingMember(m); setMemberForm({userId: m.user.id, role: m.role_in_project, responsibility: m.responsibility, start_date: m.start_date, end_date: m.end_date}); setIsMemberModalOpen(true);}} className="text-slate-300 hover:text-blue-500 p-1"><Icons.Edit /></button><button onClick={() => handleDeleteMember(m.documentId)} className="text-slate-300 hover:text-red-500 p-1"><Icons.Trash /></button></div>)}</div>{m.responsibility && <p className="mt-3 text-[10px] text-slate-600 italic font-bold leading-relaxed border-t border-slate-50 pt-2 font-sans">"{m.responsibility}"</p>}</div></div></div>);})}
            </div>
        </section>

        {/* รายการหมวดงาน */}
        <section className="space-y-4"><h2 className="font-black text-slate-800 px-2 text-lg uppercase tracking-wider font-sans">รายการหมวดงาน</h2>
            {project?.jobs?.map((job: any) => { const avgProg = job.job_tasks && job.job_tasks.length > 0 ? Math.round(job.job_tasks.reduce((s:number, t:any)=> s+(t.progress||0),0) / job.job_tasks.length) : 0;
                return (<div key={job.documentId} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 relative group transition-all hover:shadow-md"><div className="mb-4 pr-16"><h3 className="font-black text-slate-800 text-lg truncate font-sans">{job.title}</h3><div className="flex items-center gap-3 mt-3"><div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-50"><div className="h-full bg-blue-500 transition-all duration-1000 ease-out" style={{ width: `${avgProg}%` }}></div></div><span className="text-xl font-black text-blue-600 drop-shadow-sm">{avgProg}%</span></div></div>{canManage && <div className="absolute top-6 right-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => {setEditingJob(job); setIsEditOpen(true);}} className="p-2 text-slate-300 hover:text-blue-600"><Icons.Edit /></button><button onClick={(e) => handleDeleteJob(e, job.documentId, job.title)} className="p-2 text-slate-300 hover:text-red-500"><Icons.Trash /></button></div>}<Link href={`/manage/project/${projectId}/job/${job.documentId}`} className="flex items-center justify-between w-full bg-white border-2 border-red-100 hover:border-red-500 text-red-600 px-6 py-4 rounded-2xl text-sm font-black transition-all shadow-sm active:scale-[0.97] group"><span className="flex items-center gap-2">🔍 ดูรายการย่อย ({job.job_tasks?.length || 0})</span><span className="text-2xl group-hover:translate-x-1 transition-transform">→</span></Link></div>);})}
        </section>

        {/* Site Diary */}
        <section className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 mb-20">
            <h2 className="font-black text-slate-800 mb-8 flex items-center gap-2 text-lg font-sans">📝 Site Diary <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse shadow-md shadow-red-200">Live</span></h2>
            <div className="relative pl-2 space-y-10">
                {groupedLogs.map(([dateKey, logs], gIdx) => (
                    <div key={dateKey}>
                        <div className="flex items-center gap-2 mb-5"><div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-50 shrink-0"></div><span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{dateKey}</span></div>
                        <div className="space-y-4 ml-4">
                            {logs.map((log: any, lIdx) => {
                                const isDef = log.Log_Type === 'Defect';
                                const isInfo = log.Log_Type === 'Info';
                                const hasMedia = log.Media && log.Media.length > 0;
                                
                                let cardStyle = 'bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-200/50';
                                let textStyle = 'text-slate-800';
                                let descStyle = 'text-slate-500';
                                let icon = log.Log_Type === 'Progress' ? "📈" : "📝";

                                if (isDef) {
                                    cardStyle = 'bg-red-50 border-red-200 shadow-inner';
                                    textStyle = 'text-red-700';
                                    descStyle = 'text-red-600';
                                    icon = "🚨";
                                } else if (isInfo) {
                                    cardStyle = 'bg-sky-50 border-sky-200 shadow-inner';
                                    textStyle = 'text-sky-800';
                                    descStyle = 'text-sky-600';
                                    icon = "ℹ️";
                                }

                                return (
                                    <Link 
                                        key={`${log.documentId}-${gIdx}-${lIdx}`} 
                                        href={`/manage/project/${projectId}/job/${log.jobId}/task/${log.taskId}`}
                                        ref={(gIdx === groupedLogs.length - 1 && lIdx === logs.length - 1) ? lastLogElementRef : null}
                                        className={`block p-5 rounded-[2rem] border transition-all ${cardStyle}`}
                                    >
                                        <div className="flex gap-4">
                                            {hasMedia ? (<div className="w-16 h-16 rounded-2xl bg-slate-100 shrink-0 overflow-hidden border border-slate-100 shadow-sm"><img src={log.Media[0].url.startsWith('http') ? log.Media[0].url : `${STRAPI_URL}${log.Media[0].url}`} className="w-full h-full object-cover" /></div>) 
                                            : (<div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-2xl ${isDef ? 'bg-red-100 text-red-600' : (isInfo ? 'bg-sky-100 text-sky-600' : 'bg-slate-50 text-slate-500 shadow-inner')}`}>{icon}</div>)}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <h4 className={`text-sm font-black truncate leading-tight font-sans ${textStyle}`}>
                                                        {log.taskName} 
                                                        {/* ✅ ข้อความสถานะที่ปรับแก้แล้ว */}
                                                        {isDef ? (
                                                            <span className="text-[10px] text-red-600 font-black ml-1.5 bg-red-100 px-2 py-0.5 rounded-full shadow-sm">(ข้อควรระวัง)</span>
                                                        ) : isInfo ? (
                                                            <span className="text-[10px] text-sky-600 font-black ml-1.5 bg-sky-100 px-2 py-0.5 rounded-full shadow-sm">(อัพเดตข้อมูล)</span>
                                                        ) : (
                                                            <span className="text-[10px] text-blue-600 font-black ml-1.5 bg-blue-50 px-1.5 py-0.5 rounded shadow-sm">({log.progress_percentage || 0}%)</span>
                                                        )}
                                                    </h4>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{new Date(log.action_date || log.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className={`text-[11px] truncate-2-lines leading-relaxed font-bold font-sans ${descStyle}`}>{log.Description}</p>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
                {loadingLogs && <div className="text-center py-4 text-xs text-slate-300 animate-pulse font-bold font-sans tracking-widest uppercase">Loading more logs...</div>}
                {!hasMoreLogs && siteLogs.length > 0 && <div className="text-center py-4 text-[10px] font-black text-slate-200 uppercase tracking-widest font-sans">End of site diary</div>}
            </div>
        </section>
      </main>

      {canManage && <button onClick={() => {setNewJobTitle(""); setIsCreateOpen(true);}} className="fixed bottom-8 right-6 w-16 h-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center text-4xl z-[999] active:scale-95 transition-transform font-light shadow-slate-900/40">+</button>}
      
      {/* ✅ 2. Report Modal ใหม่ (Logic ย้ายไปอยู่ใน Component แล้ว) */}
      <ReportModal 
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          project={project}
          members={members}
          siteLogs={siteLogs}
          projectId={projectId}
      />

      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10">
            <h3 className="font-black text-xl mb-6 text-slate-800 tracking-tight font-sans text-center">🏗️ เพิ่มหมวดงานใหม่</h3>
            <form onSubmit={handleCreateJob} className="space-y-4">
              <input type="text" placeholder="ชื่อหมวดงาน" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none font-black text-slate-700 focus:ring-2 focus:ring-blue-100" value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} autoFocus />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest shadow-sm">ยกเลิก</button>
                <button type="submit" disabled={submitting} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">สร้าง</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditOpen && editingJob && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-black text-xl mb-6 text-slate-800 font-sans text-center">✏️ แก้ไขหมวดงาน</h3>
            <form onSubmit={handleUpdateJob} className="space-y-4">
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none font-black text-slate-700 focus:ring-2 focus:ring-blue-100" value={editingJob.title} onChange={e => setEditingJob({...editingJob, title: e.target.value})} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs">ยกเลิก</button>
                <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMemberModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10 h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 py-2">
              <h3 className="font-black text-xl text-slate-800 font-sans">{editingMember ? "✏️ แก้ไขข้อมูล" : "👷 มอบหมายงาน"}</h3>
              <button onClick={() => setIsMemberModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors shadow-sm">✕</button>
            </div>
            <form onSubmit={handleSaveMember} className="space-y-4 font-sans px-1">
              <div>
                <label className="text-[10px] font-black text-slate-400 ml-1 mb-2 block uppercase tracking-widest">เลือกพนักงาน</label>
                <select className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-black outline-none appearance-none" value={memberForm.userId} onChange={e => setMemberForm({...memberForm, userId: e.target.value})} required>
                  <option value="" disabled>-- เลือกรายชื่อ --</option>
                  {users.map(u => (<option key={u.id} value={u.id}>{u.username} ({u.position || "พนักงาน"})</option>))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 ml-1 mb-2 block uppercase tracking-widest">หน้าที่ในไซต์นี้</label>
                <input className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-black outline-none" value={memberForm.role} onChange={e => setMemberForm({...memberForm, role: e.target.value})} required placeholder="เช่น หัวหน้าทีมติดตั้ง" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 ml-1 mb-2 block uppercase tracking-widest">เริ่ม</label>
                  <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-black outline-none" value={memberForm.start_date} onChange={e => setMemberForm({...memberForm, start_date: e.target.value})} required />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 ml-1 mb-2 block uppercase tracking-widest">ถึง (ถ้ามี)</label>
                  <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-black outline-none" value={memberForm.end_date} onChange={e => setMemberForm({...memberForm, end_date: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 ml-1 mb-2 block uppercase tracking-widest">ความรับผิดชอบ</label>
                <textarea rows={3} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-black outline-none resize-none shadow-inner" value={memberForm.responsibility} onChange={e => setMemberForm({...memberForm, responsibility: e.target.value})} placeholder="ระบุงานที่ต้องรับผิดชอบ..." />
              </div>
              <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-4 active:scale-95 transition-all shadow-slate-900/30">ยืนยันการมอบหมาย</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}