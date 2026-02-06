// app/manage/project/[id]/components/ReportModal.tsx
"use client";

import React, { useState, useMemo } from 'react';

// Icons รวมไว้ที่นี่
const Icons = {
  Copy: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375a1.125 1.125 0 0 1-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /></svg>),
  Line: () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M20.25 8.511C20.25 4.364 16.216 1 11.25 1c-4.965 0-9 3.364-9 7.511 0 3.75 2.215 6.463 6.638 7.379.792.17.618.529.54.918l-.204 1.22c-.116.685.297.97.77.632l5.772-4.148c3.085-1.077 4.684-3.056 4.684-6.001ZM8.5 9.75h-2a.75.75 0 0 1 0-1.5h2a.75.75 0 0 1 0 1.5Zm8 0h-2a.75.75 0 0 1 0-1.5h2a.75.75 0 0 1 0 1.5Zm-4 0h-2a.75.75 0 0 1 0-1.5h2a.75.75 0 0 1 0 1.5Z" /></svg>),
  ArrowLeft: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>),
  Plus: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>),
  Trash: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>),
};

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  members: any[];
  siteLogs: any[];
  projectId: string;
}

export default function ReportModal({ isOpen, onClose, project, members, siteLogs, projectId }: ReportModalProps) {
  // State: จัดการหน้าจอ (Menu หลัก vs หน้าแผนงาน)
  const [view, setView] = useState<'menu' | 'plan'>('menu');
  
  // State: สำหรับหน้าแผนงาน (Plan)
  const [planList, setPlanList] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [planProgress, setPlanProgress] = useState(0);
  const [planDesc, setPlanDesc] = useState("");

  if (!isOpen) return null;

  // รวม Task ทั้งหมดเพื่อใส่ Dropdown
  const allTasks = useMemo(() => {
    if (!project?.jobs) return [];
    const tasks: any[] = [];
    project.jobs.forEach((job: any) => {
        if (job.job_tasks) {
            job.job_tasks.forEach((task: any) => {
                tasks.push({
                    id: task.documentId || task.id,
                    name: task.task_name,
                    jobTitle: job.title,
                    currentProgress: task.progress
                });
            });
        }
    });
    return tasks;
  }, [project]);

  // ฟังก์ชันเพิ่มรายการแผนงาน
  const handleAddPlanItem = () => {
    if (!selectedTaskId) return;
    const task = allTasks.find(t => t.id.toString() === selectedTaskId.toString());
    
    if (task) {
        setPlanList(prev => [...prev, {
            ...task,
            targetProgress: planProgress,
            description: planDesc
        }]);
        
        // Reset Form เพื่อให้กรอกรายการต่อไปได้เลย
        setSelectedTaskId("");
        setPlanProgress(0);
        setPlanDesc("");
    }
  };

  // ลบรายการแผนงานที่เพิ่มผิด
  const removePlanItem = (index: number) => {
      setPlanList(prev => prev.filter((_, i) => i !== index));
  };

  const generateReportText = (type: 'summary' | 'defect' | 'team' | 'info' | 'plan') => {
    if (!project) return "";
    const dateStr = new Date().toLocaleDateString('th-TH', { dateStyle: 'long' });
    let text = "";

    if (type === 'plan') {
        text = `📅 แผนการทำงานวันนี้: ${dateStr}\n🏠 โครงการ: ${project.name}\n--------------------\n`;
        if (planList.length === 0) {
            text += "⚠️ ยังไม่ได้ระบุแผนงาน\n";
        } else {
            planList.forEach((item, index) => {
                text += `${index + 1}. ${item.name}\n`;
                text += `   🎯 เป้าหมาย: ${item.targetProgress}% (เดิม ${item.currentProgress || 0}%)\n`;
                if (item.description) text += `   📝 รายละเอียด: ${item.description}\n`;
            });
        }
    } 
    else if (type === 'summary') {
        const totalProjProgress = (() => {
            if (!project?.jobs || project.jobs.length === 0) return 0;
            const jobAverages = project.jobs.map((job: any) => {
                if (!job.job_tasks || job.job_tasks.length === 0) return job.progress || 0;
                return job.job_tasks.reduce((s: number, t: any) => s + (t.progress || 0), 0) / job.job_tasks.length;
            });
            return Math.round(jobAverages.reduce((sum: number, avg: number) => sum + avg, 0) / project.jobs.length);
        })();

        text = `📅 รายงานประจำวัน: ${dateStr}\n🏠 โครงการ: ${project.name}\n📍 พิกัด: ${project.location}\n📊 ความคืบหน้า: ${totalProjProgress}%\n--------------------\n`;
        project.jobs?.forEach((job: any, index: number) => {
            const jobProg = job.job_tasks && job.job_tasks.length > 0 ? Math.round(job.job_tasks.reduce((s:number, t:any)=> s+(t.progress||0),0) / job.job_tasks.length) : 0;
            text += `${index + 1}. ${job.title} (${jobProg}%)\n`;
            const sortedTasks = [...(job.job_tasks || [])].sort((a,b) => (a.task_name || "").localeCompare((b.task_name || ""), 'th', {numeric:true}));
            sortedTasks.forEach((task: any) => {
                let icon = '⏳'; if (task.progress === 100) icon = '✅'; else if (task.progress > 0) icon = '🚧';
                text += `   ${icon} ${task.task_name}: ${task.progress || 0}%\n`;
            });
        });
    } else if (type === 'defect') {
        text = `🚨 รายงาน Defect: ${dateStr}\n🏠 โครงการ: ${project.name}\n--------------------\n`;
        const defects = siteLogs.filter(log => log.Log_Type === 'Defect');
        if (defects.length === 0) {
            text += "✅ ไม่พบ Defect ในระบบล่าสุด\n";
        } else {
            defects.forEach((d, i) => {
                text += `${i+1}. ${d.taskName} (${new Date(d.createdAt).toLocaleDateString('th-TH')})\n   ⚠️ ${d.Description}\n`;
            });
        }
    } else if (type === 'team') {
        text = `👷 รายงานทีมงาน: ${dateStr}\n🏠 โครงการ: ${project.name}\n--------------------\n`;
        members.forEach((m, i) => {
             const status = !m.end_date || new Date(m.end_date) >= new Date() ? '🟢' : '⚪';
             text += `${i+1}. ${status} ${m.user?.username} (${m.role_in_project})\n`;
        });
    } else if (type === 'info') {
        text = `ℹ️ บันทึกทั่วไป (Info): ${dateStr}\n🏠 โครงการ: ${project.name}\n--------------------\n`;
        const infos = siteLogs.filter(log => log.Log_Type === 'Info');
        if (infos.length === 0) {
             text += "📝 ไม่มีการบันทึก Info ล่าสุด\n";
        } else {
             infos.forEach((log, i) => {
                 text += `${i+1}. ${log.taskName}\n   💬 ${log.Description}\n`;
             });
        }
    }
    
    // ใส่ Link ท้ายสุดทุกรายงาน
    text += `\n🔗 Link: http://siriwong.online/manage/project/${projectId}`;
    return text;
  };

  const handleCopyReport = (type: any) => {
    const text = generateReportText(type);
    if (!text) return;
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        alert(`✅ คัดลอกรายงานเรียบร้อย!`);
    } catch (err) {
        console.error('Copy failed', err);
        alert("❌ คัดลอกไม่สำเร็จ");
    }
    document.body.removeChild(textArea);
    if (type !== 'plan') onClose(); // หน้า Plan อาจจะอยาก copy แล้วแก้ต่อ ไม่ปิด Modal ทันที
  };

  const handleShareLine = (type: any) => {
    const text = generateReportText(type);
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank');
    if (type !== 'plan') onClose();
  };

  // ------------------------------------------
  // RENDER: PLAN VIEW (หน้าแผนงาน)
  // ------------------------------------------
  if (view === 'plan') {
    return (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 space-y-4 max-h-[85vh] overflow-y-auto flex flex-col">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                 <button onClick={() => setView('menu')} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors">
                    <Icons.ArrowLeft />
                 </button>
                 <h3 className="font-black text-lg text-slate-800 font-sans">📅 แผนงานวันนี้</h3>
                 <div className="w-10"></div> {/* Spacer */}
              </div>

              {/* Input Form Section */}
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
                  <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">1. เลือกงาน</label>
                      <select 
                        className="w-full p-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-200 text-sm"
                        value={selectedTaskId}
                        onChange={(e) => {
                            setSelectedTaskId(e.target.value);
                            // Auto set current progress
                            const task = allTasks.find(t => t.id.toString() === e.target.value);
                            if(task) setPlanProgress(task.currentProgress || 0);
                        }}
                      >
                          <option value="">-- เลือกรายการ --</option>
                          {project?.jobs?.map((job: any) => (
                              <optgroup key={job.id} label={job.title}>
                                  {job.job_tasks?.map((t: any) => (
                                      <option key={t.documentId || t.id} value={t.documentId || t.id}>{t.task_name}</option>
                                  ))}
                              </optgroup>
                          ))}
                      </select>
                  </div>

                  <div className={`transition-all duration-300 ${selectedTaskId ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                      <div className="flex justify-between items-end mb-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">2. เป้าหมายวันนี้</label>
                        <span className="text-xl font-black text-violet-600">{planProgress}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" step="5" 
                        value={planProgress} 
                        onChange={(e) => setPlanProgress(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                      />
                  </div>

                  <div className={`transition-all duration-300 ${selectedTaskId ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">3. รายละเอียด (ถ้ามี)</label>
                      <input 
                        type="text" 
                        placeholder="เช่น เตรียมพื้นที่, รอของเข้า" 
                        className="w-full p-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-200 text-sm"
                        value={planDesc}
                        onChange={(e) => setPlanDesc(e.target.value)}
                      />
                  </div>

                  <button 
                    onClick={handleAddPlanItem}
                    disabled={!selectedTaskId}
                    className="w-full py-3 bg-violet-600 text-white rounded-2xl font-black shadow-lg shadow-violet-200 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                  >
                      <Icons.Plus /> เพิ่มรายการ
                  </button>
              </div>

              {/* List Preview Section */}
              <div className="flex-1 overflow-y-auto min-h-[150px]">
                  <h4 className="font-black text-slate-400 text-xs uppercase tracking-widest mb-3 text-center">รายการที่เลือก ({planList.length})</h4>
                  {planList.length === 0 ? (
                      <div className="text-center text-slate-300 py-8 text-sm">ยังไม่มีรายการ</div>
                  ) : (
                      <div className="space-y-2">
                          {planList.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-start bg-violet-50 p-3 rounded-2xl border border-violet-100 animate-in slide-in-from-bottom-2">
                                  <div>
                                      <p className="font-black text-slate-800 text-sm">{item.name}</p>
                                      <p className="text-[11px] text-violet-600 font-bold">เป้าหมาย: {item.targetProgress}% {item.description && `(${item.description})`}</p>
                                  </div>
                                  <button onClick={() => removePlanItem(idx)} className="text-red-400 hover:text-red-600 p-1"><Icons.Trash /></button>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2 border-t border-slate-100 mt-auto">
                  <button onClick={() => handleCopyReport('plan')} disabled={planList.length === 0} className="flex-1 bg-white border border-slate-200 py-3 rounded-2xl text-xs font-black text-slate-600 shadow-sm disabled:opacity-50">คัดลอก</button>
                  <button onClick={() => handleShareLine('plan')} disabled={planList.length === 0} className="flex-1 bg-[#06C755] py-3 rounded-2xl text-xs font-black text-white shadow-xl shadow-green-100 disabled:opacity-50">แชร์ LINE</button>
              </div>

           </div>
        </div>
    );
  }

  // ------------------------------------------
  // RENDER: MENU VIEW (หน้าเลือกเมนู)
  // ------------------------------------------
  return (
    <div className="fixed inset-0 bg-black/60 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
       <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
             <h3 className="font-black text-lg text-slate-800 font-sans">📊 เลือกประเภทรายงาน</h3>
             <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">✕</button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Plan (NEW) */}
            <button onClick={() => setView('plan')} className="col-span-2 bg-violet-50 border border-violet-100 p-4 rounded-3xl flex items-center gap-4 hover:shadow-lg hover:shadow-violet-100 transition-all active:scale-95 text-left group">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">📅</div>
                <div>
                    <h4 className="font-black text-violet-900 text-sm">แผนงานวันนี้</h4>
                    <p className="text-[10px] text-violet-500">สร้างรายการงานที่จะทำ</p>
                </div>
            </button>

            {/* Summary */}
            <div className="col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                    <div className="text-xl">📋</div>
                    <div>
                        <p className="font-black text-slate-800 text-xs">สรุปภาพรวม</p>
                        <p className="text-[9px] text-slate-400">ส่งเจ้าของบ้าน / เจ้านาย</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleCopyReport('summary')} className="flex-1 bg-white border border-slate-200 py-1.5 rounded-xl text-[10px] font-black text-slate-600 shadow-sm active:scale-95">คัดลอก</button>
                    <button onClick={() => handleShareLine('summary')} className="flex-1 bg-[#06C755] py-1.5 rounded-xl text-[10px] font-black text-white shadow-sm active:scale-95">LINE</button>
                </div>
            </div>

            {/* Defect & Info Buttons (Condensed) */}
            <div className="bg-red-50 border border-red-100 p-3 rounded-2xl space-y-2">
                 <div className="text-xl">🚨</div>
                 <p className="font-black text-red-800 text-xs">Defect</p>
                 <button onClick={() => handleShareLine('defect')} className="w-full bg-white text-red-600 py-1 rounded-lg text-[10px] font-black shadow-sm">ส่ง Line</button>
            </div>
            
            <div className="bg-sky-50 border border-sky-100 p-3 rounded-2xl space-y-2">
                 <div className="text-xl">ℹ️</div>
                 <p className="font-black text-sky-800 text-xs">Info</p>
                 <button onClick={() => handleShareLine('info')} className="w-full bg-white text-sky-600 py-1 rounded-lg text-[10px] font-black shadow-sm">ส่ง Line</button>
            </div>

            {/* Team */}
            <div className="col-span-2 bg-blue-50 border border-blue-100 p-3 rounded-2xl flex items-center justify-between px-4">
                 <div className="flex items-center gap-2">
                    <span className="text-xl">👷</span>
                    <span className="font-black text-blue-800 text-xs">เช็คชื่อทีมงาน</span>
                 </div>
                 <button onClick={() => handleShareLine('team')} className="bg-white text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm">ส่ง Line</button>
            </div>

            {/* Material (NEW Placeholder) */}
            <button onClick={() => alert('🚧 ระบบบันทึกเบิกจ่าย อยู่ระหว่างการพัฒนาครับ')} className="col-span-2 bg-amber-50 border border-amber-100 p-3 rounded-2xl flex items-center justify-center gap-2 text-amber-700 hover:bg-amber-100 active:scale-95 transition-all">
                <span className="text-lg">🧱</span>
                <span className="font-black text-xs">บันทึกเบิกจ่ายวัสดุ</span>
            </button>
          </div>

       </div>
    </div>
  );
}