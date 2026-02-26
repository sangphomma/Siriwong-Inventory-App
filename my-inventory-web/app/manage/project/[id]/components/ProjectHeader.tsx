// app/manage/project/[id]/components/ProjectHeader.tsx
"use client";

import Link from "next/link";
import { STRAPI_URL } from "@/services/config";
import { ChevronLeft, Home } from "lucide-react"; // เพิ่ม icon

// ... (function getUserColor เหมือนเดิม) ...
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
    Report: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>),
};

// ทำให้ members และ onOpenReport เป็น Optional (?) เพื่อรองรับหน้า Survey
interface ProjectHeaderProps {
    project: any;
    members?: any[]; 
    onOpenReport?: () => void;
}

export default function ProjectHeader({ project, members = [], onOpenReport }: ProjectHeaderProps) {
    
    const mapQuery = useMapQuery(project);

    // แก้ Syntax Template Literal ($) ให้ถูกต้อง
    const getMapLink = () => {
        if (project?.coordinates && project.coordinates.trim() !== "") {
            const cleanCoords = project.coordinates.replace(/\s/g, '');
            return `https://www.google.com/maps/search/?api=1&query=${cleanCoords}`;
        }
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project?.location || "")}`;
    };

    return (
        <div className="bg-slate-900 text-white rounded-b-[3rem] p-6 pb-20 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            
            <div className="relative z-10 max-w-md mx-auto">
                {/* Header Actions Row */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-2">
                        {/* ปุ่มกลับหน้า Manage (รายชื่อโครงการ) */}
                        <Link href="/manage" className="text-white/60 hover:text-white hover:bg-white/10 text-xs flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-md transition-all">
                            <ChevronLeft size={14} /> กลับ
                        </Link>
                        
                        {/* ✅ ปุ่มกลับหน้า Home (เมนูหลัก 4 ปุ่ม) */}
                        <Link href="/" className="text-white/60 hover:text-white hover:bg-white/10 text-xs flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-md transition-all">
                            <Home size={14} />
                        </Link>
                    </div>
                    
                    {/* ปุ่ม Report (โชว์เฉพาะถ้ามีฟังก์ชันส่งมา) */}
                    {onOpenReport && (
                        <button 
                        onClick={onOpenReport} 
                        className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-full text-[10px] font-black shadow-lg transition-transform active:scale-95 flex items-center gap-2 uppercase tracking-tight ring-2 ring-emerald-500/30"
                        >
                            <Icons.Report /> <span>Report</span>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded shadow-sm ${project?.status === 'survey' ? 'bg-purple-500 text-white' : 'bg-amber-500 text-black'}`}>
                        {project?.status === 'survey' ? 'SURVEY' : 'On-Going'}
                    </span>
                    <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Project #{project?.id || project?.documentId?.slice(-4)}</span>
                </div>
                
                <h1 className="text-3xl font-black mb-1 leading-tight">{project?.name}</h1>
                <p className="text-sm text-slate-400 flex items-center gap-1 mb-6 tracking-tight font-bold">📍 {project?.location}</p>
                
                {/* Embedded Map */}
                <div className="w-full h-40 rounded-[2rem] overflow-hidden border-2 border-white/10 shadow-lg bg-slate-800 relative mb-8 group">
                    <iframe
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        marginHeight={0}
                        marginWidth={0}
                        // แก้ URL map ให้ถูกต้อง ใส่ $
                        src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                        className="opacity-80 group-hover:opacity-100 transition-opacity"
                    ></iframe>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white/5 backdrop-blur-xl p-5 rounded-[2rem] border border-white/10 shadow-inner group cursor-pointer hover:bg-white/10 transition">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">ระยะทาง</span>
                            <a href={getMapLink()} target="_blank" rel="noreferrer" className="text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold font-sans flex items-center gap-1">MAP ↗</a>
                        </div>
                        <p className="text-2xl font-black">{project?.distance_from_branch || "0"} <span className="text-xs text-white/40 font-bold">กม.</span></p>
                    </div>
                    
                    <div className="bg-white/5 backdrop-blur-xl p-5 rounded-[2rem] border border-white/10 shadow-inner"><span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">แผนงาน</span><p className="text-[11px] font-black leading-tight">{project?.start_date ? new Date(project.start_date).toLocaleDateString('th-TH', {day:'numeric', month:'short', year:'2-digit'}) : "---"} -<br/>{project?.end_date ? new Date(project.end_date).toLocaleDateString('th-TH', {day:'numeric', month:'short', year:'2-digit'}) : "---"}</p></div>
                </div>
                
                {/* Team Summary (Optional Render) */}
                {members && members.length > 0 && (
                     <div className="px-1 mt-6"><span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] block mb-3 font-bold">Project Team Summary</span>
                        <div className="flex -space-x-3">
                            {members.map((m, idx) => { 
                                const theme = getUserColor(m.user?.username || ""); 
                                return (
                                    <div key={`${m.id}-${idx}`} className={`h-10 w-10 rounded-2xl ring-4 ring-slate-900 overflow-hidden ${theme.avatar} shadow-lg transition-transform hover:-translate-y-1`}>
                                        {m.user?.avatar?.url ? 
                                            <img src={m.user.avatar.url.startsWith('http') ? m.user.avatar.url : `${STRAPI_URL}${m.user.avatar.url}`} className="h-full w-full object-cover" /> 
                                            : <div className="h-full w-full flex items-center justify-center text-xs font-bold text-white uppercase">{m.user?.username?.charAt(0)}</div>
                                        }
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function useMapQuery(project: any) {
    if (project?.coordinates && project.coordinates.trim().length > 0) {
        return project.coordinates.replace(/\s/g, '');
    }
    return encodeURIComponent(project?.location || "Bangkok");
}