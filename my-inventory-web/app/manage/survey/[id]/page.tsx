/* eslint-disable @typescript-eslint/no-explicit-any */

// app/manage/survey/[id]/page.tsx
"use client";

import { useEffect, useState, use } from "react";
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
  // ✅ 1. Import Dictionary
  fetchDictionary, createDictionaryWord
} from "@/services/api";

import ProjectHeader from "../../project/[id]/components/ProjectHeader";
import { SurveyFeed } from "../components/SurveyFeed";
// ✅ 2. Import SmartInput
import { SmartInput } from "@/app/components/SmartInput";

// --- Helper Functions & Icons ---
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

const Icons = {
  Trash: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>),
  Edit: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>),
};

export default function SurveyDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { user } = useAuth();
  
  const [project, setProject] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [memberForm, setMemberForm] = useState({ userId: "", role: "", responsibility: "", start_date: "", end_date: "" });

  // ✅ 3. State สำหรับ Dictionary
  const [jobTitleSuggestions, setJobTitleSuggestions] = useState<string[]>([]);
  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([]);

  const isAdmin = user?.role?.name === 'Admin' || user?.role?.type === 'admin';
  const isOwner = !!user && !!project?.creator && project.creator.id === user.id;
  const canManage = !!user && (isAdmin || isOwner);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const [projData, membersData] = await Promise.all([fetchProjectJobs(projectId), getProjectMembers(projectId)]);
      setProject(projData); setMembers(membersData);
      if (user) { try { const u = await getAllUsers(); setUsers(u); } catch (e) {} }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const loadDictionaries = async () => {
    try {
       setJobTitleSuggestions(await fetchDictionary('survey_job_title'));
       setRoleSuggestions(await fetchDictionary('survey_member_role'));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { 
    if (projectId) { 
      loadProjectData(); 
      loadDictionaries(); // โหลด Dictionary ตอนเปิดหน้า
    } 
  }, [projectId]);

  // Handlers
  const handleCreateJob = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    try { 
      setSubmitting(true); 
      
      // ✅ 4. Auto-save Dictionary สำหรับสร้างหมวดงาน
      const t = newJobTitle.trim();
      if (t && !jobTitleSuggestions.includes(t)) {
          createDictionaryWord(t, 'survey_job_title').then(loadDictionaries);
      }

      await createJob(newJobTitle, project.documentId); 
      setNewJobTitle(""); 
      setIsCreateOpen(false); 
      await loadProjectData(); 
    } catch (error) { 
      alert("ล้มเหลว"); 
    } finally { 
      setSubmitting(false); 
    } 
  };

  const handleDeleteJob = async (e: any, id: string, title: string) => { e.stopPropagation(); if (confirm(`ลบ ${title}?`)) { await deleteJob(id); loadProjectData(); } };
  
  const handleUpdateJob = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    try { 
      // ✅ Auto-save Dictionary สำหรับตอนแก้ไขหมวดงานด้วย
      const t = editingJob.title.trim();
      if (t && !jobTitleSuggestions.includes(t)) {
          createDictionaryWord(t, 'survey_job_title').then(loadDictionaries);
      }

      await updateJob(editingJob.documentId, { title: editingJob.title }); 
      setIsEditOpen(false); 
      await loadProjectData(); 
    } catch (error) { alert("แก้ไขไม่สำเร็จ"); } 
  };

  const handleSaveMember = async (e: any) => { 
    e.preventDefault(); 
    try { 
      // ✅ Auto-save Dictionary สำหรับ Role สมาชิก
      const roleTrimmed = memberForm.role.trim();
      if (roleTrimmed && !roleSuggestions.includes(roleTrimmed)) {
          createDictionaryWord(roleTrimmed, 'survey_member_role').then(loadDictionaries);
      }

      if (editingMember) await updateProjectMember(editingMember.documentId, memberForm); 
      else await addProjectMember({ projectSiteId: projectId, ...memberForm }); 
      setIsMemberModalOpen(false); 
      loadProjectData(); 
    } catch (err) { alert("ล้มเหลว"); } 
  };

  const handleDeleteMember = async (id: string) => { if(confirm("ลบสมาชิก?")) { await deleteProjectMember(id); loadProjectData(); } };
  
  if (loading && !project) return <div className="h-screen flex items-center justify-center text-slate-400 font-bold tracking-widest uppercase text-xs">Loading Survey Data...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans relative">
      
      <ProjectHeader 
         project={project}
         members={members} 
         onOpenReport={() => {}} 
      />

      <main className="max-w-md mx-auto px-4 relative z-10 space-y-6 mt-4">
        
        <section className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8">
                <h2 className="font-black text-violet-800 text-base font-sans">🕵️ ทีมสำรวจ (Survey Team)</h2>
                {canManage && <button onClick={() => { setEditingMember(null); setMemberForm({ userId: "", role: "", responsibility: "", start_date: "", end_date: "" }); setIsMemberModalOpen(true); }} className="text-[10px] bg-violet-50 text-violet-600 px-4 py-2 rounded-full font-black shadow-sm tracking-tight">+ เพิ่มทีมงาน</button>}
            </div>
            <div className="relative pl-4 border-l-2 border-dashed border-violet-100 space-y-10">
                {Array.isArray(members) && members.map((m: any, idx: number) => { const theme = getUserColor(m.user?.username || ""); const isActive = !m.end_date || new Date(m.end_date) >= new Date();
                    return (<div key={`${m.id}-${idx}`} className="relative pl-10"><div className={`absolute -left-[27px] top-0 w-6 h-6 rounded-full border-4 border-white shadow-md z-10 ${isActive ? 'bg-violet-500' : 'bg-slate-200'}`}></div><div className="flex items-center gap-2 mb-3 -mt-1"><span className="text-[10px] font-black text-violet-600 uppercase tracking-tighter">{new Date(m.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>{isActive && <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-black border border-emerald-100 shadow-sm shadow-emerald-50">Active</span>}</div><div className={`relative group p-5 rounded-[2rem] border shadow-sm flex items-start gap-4 transition-all hover:shadow-lg ${isActive ? `bg-white ${theme.border}` : 'bg-slate-50 opacity-60'}`}><div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-inner shrink-0 overflow-hidden ${theme.avatar} ring-4 ring-offset-2 ${isActive ? theme.glow : ''}`}>{m.user?.avatar?.url ? <img src={m.user.avatar.url.startsWith('http') ? m.user.avatar.url : `${STRAPI_URL}${m.user.avatar.url}`} className="h-full w-full object-cover rounded-2xl" /> : <span>{m.user?.username?.charAt(0).toUpperCase()}</span>}</div><div className="flex-1 min-w-0"><div className="flex justify-between"><div><p className={`font-black text-base ${isActive ? theme.text : 'text-slate-700'}`}>{m.user?.username}</p><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{m.role_in_project}</p></div>{canManage && (<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition"><button onClick={() => {setEditingMember(m); setMemberForm({userId: m.user.id, role: m.role_in_project, responsibility: m.responsibility, start_date: m.start_date, end_date: m.end_date}); setIsMemberModalOpen(true);}} className="text-slate-300 hover:text-violet-500 p-1"><Icons.Edit /></button><button onClick={() => handleDeleteMember(m.documentId)} className="text-slate-300 hover:text-red-500 p-1"><Icons.Trash /></button></div>)}</div>{m.responsibility && <p className="mt-3 text-[10px] text-slate-600 italic font-bold leading-relaxed border-t border-slate-50 pt-2 font-sans">&quot;{m.responsibility}&quot;</p>}</div></div></div>);})}
            </div>
        </section>

        <section className="space-y-4">
            <h2 className="font-black text-violet-800 px-2 text-lg uppercase tracking-wider font-sans">📋 ขอบเขตการประเมิน</h2>
            {Array.isArray(project?.jobs) && project.jobs.map((job: any) => { 
                const tasks = Array.isArray(job.job_tasks) ? job.job_tasks : [];
                return (
                  <div key={job.documentId} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-violet-100 relative group transition-all hover:shadow-md">
                    <div className="mb-4 pr-16">
                      <h3 className="font-black text-slate-800 text-lg truncate font-sans">{job.title}</h3>
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                         <span>📝 {tasks.length} รายการย่อยที่ต้องเช็ค</span>
                      </div>
                    </div>
                    {canManage && <div className="absolute top-6 right-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => {setEditingJob(job); setIsEditOpen(true);}} className="p-2 text-slate-300 hover:text-violet-600"><Icons.Edit /></button><button onClick={(e) => handleDeleteJob(e, job.documentId, job.title)} className="p-2 text-slate-300 hover:text-red-500"><Icons.Trash /></button></div>}
                    
                    <Link href={`/manage/project/${projectId}/job/${job.documentId}`} className="flex items-center justify-between w-full bg-violet-50 border-2 border-violet-100 hover:border-violet-500 text-violet-600 px-6 py-4 rounded-2xl text-sm font-black transition-all shadow-sm active:scale-[0.97] group mt-4">
                       <span className="flex items-center gap-2">🔍 เข้าไปจัดการรายการย่อย</span>
                       <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
                    </Link>

                  </div>
                );
            })}
        </section>

        <section className="mb-20 mt-8">
            <h2 className="font-black text-slate-800 px-2 mb-6 flex items-center gap-2 text-lg font-sans">
              📔 บันทึกการสำรวจ (Survey Logs)
            </h2>
            <SurveyFeed projectDocId={projectId} projectIntId={project?.id || 0} />
        </section>

      </main>

      {canManage && <button onClick={() => {setNewJobTitle(""); setIsCreateOpen(true);}} className="fixed bottom-8 right-6 w-16 h-16 bg-violet-600 text-white rounded-full shadow-2xl flex items-center justify-center text-4xl z-[999] active:scale-95 transition-transform font-light shadow-violet-600/40">+</button>}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10">
            <h3 className="font-black text-xl mb-6 text-slate-800 tracking-tight font-sans text-center">📋 เพิ่มขอบเขตการประเมิน</h3>
            <form onSubmit={handleCreateJob} className="space-y-4">
              
              {/* ✅ เปลี่ยนเป็น SmartInput */}
              <SmartInput 
                 placeholder="ชื่อขอบเขต (เช่น สำรวจโครงสร้างหลังคา)"
                 value={newJobTitle}
                 onValueChange={setNewJobTitle}
                 suggestions={jobTitleSuggestions}
              />

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest shadow-sm">ยกเลิก</button>
                <button type="submit" disabled={submitting} className="flex-1 py-4 bg-violet-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">สร้าง</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && editingJob && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-black text-xl mb-6 text-slate-800 font-sans text-center">✏️ แก้ไข</h3>
            <form onSubmit={handleUpdateJob} className="space-y-4">
              
              {/* ✅ เปลี่ยนเป็น SmartInput */}
              <SmartInput 
                 value={editingJob.title}
                 onValueChange={(val) => setEditingJob({...editingJob, title: val})}
                 suggestions={jobTitleSuggestions}
              />

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs">ยกเลิก</button>
                <button type="submit" className="flex-1 py-4 bg-violet-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10 h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 py-2">
              <h3 className="font-black text-xl text-slate-800 font-sans">{editingMember ? "✏️ แก้ไขข้อมูล" : "🕵️ เพิ่มทีมสำรวจ"}</h3>
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
              
              <div className="mt-2">
                {/* ✅ เปลี่ยนเป็น SmartInput */}
                <SmartInput 
                   label="หน้าที่ (Role)"
                   placeholder="เช่น คนวัดพื้นที่"
                   value={memberForm.role}
                   onValueChange={(val) => setMemberForm({...memberForm, role: val})}
                   suggestions={roleSuggestions}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 ml-1 mb-2 block uppercase tracking-widest">เริ่ม</label>
                  <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-black outline-none" value={memberForm.start_date} onChange={e => setMemberForm({...memberForm, start_date: e.target.value})} required />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 ml-1 mb-2 block uppercase tracking-widest">หมายเหตุ</label>
                <textarea rows={3} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-black outline-none resize-none shadow-inner" value={memberForm.responsibility} onChange={e => setMemberForm({...memberForm, responsibility: e.target.value})} placeholder="รายละเอียดเพิ่มเติม..." />
              </div>
              <button type="submit" className="w-full py-4 bg-violet-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-4 active:scale-95 transition-all shadow-violet-900/30">ยืนยัน</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}