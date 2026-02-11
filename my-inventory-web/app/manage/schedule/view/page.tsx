// app/manage/schedule/view/page.tsx
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Calendar, MapPin, 
  Loader2, ExternalLink, User as UserIcon, Home
} from 'lucide-react';

// API
import { getUserActivities } from '@/services/api';

const TYPE_COLORS: Record<string, string> = {
  'Survey': 'bg-emerald-100 border-l-4 border-emerald-500 text-emerald-800',
  'Design': 'bg-violet-100 border-l-4 border-violet-500 text-violet-800',
  'Programming': 'bg-slate-800 border-l-4 border-slate-500 text-slate-100',
  'Site inspection': 'bg-orange-100 border-l-4 border-orange-500 text-orange-800',
  'General': 'bg-gray-100 border-l-4 border-gray-400 text-gray-700'
};

function ScheduleViewContent() {
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('uid'); // รับ ID ของคนที่เราจะส่องจาก URL
  const targetName = searchParams.get('name'); // (Option) รับชื่อมาโชว์หัวข้อ
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); 
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (targetUserId) {
        fetchActivities();
    } else {
        setLoading(false);
    }
  }, [date, targetUserId]);

  const fetchActivities = async () => { 
      setLoading(true); 
      try { 
          // บังคับดึงข้อมูลของ targetUserId แทนที่จะเป็น user.id ของคนล็อกอิน
          const res = await getUserActivities(targetUserId!, date); 
          setActivities(res); 
      } catch (error) { 
          console.error(error); 
      } finally { 
          setLoading(false); 
      } 
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white px-4 pt-4 pb-2 sticky top-0 z-10 shadow-sm border-b border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2">
            <Link href="/manage" className="p-2 -ml-2 text-slate-500 hover:text-blue-600 transition-colors">
               <ArrowLeft size={24} />
            </Link>
            <Link href="/manage" className="p-2 text-slate-500 bg-slate-100 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-all">
               <Home size={20} />
            </Link>
          </div>
          
          <div className="text-right">
             <h1 className="text-lg font-bold text-slate-800">ตารางงาน</h1>
             {targetName && <p className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded inline-block">ของ {targetName}</p>}
          </div>
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-lg">
            <Calendar className="text-slate-500" size={20} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent w-full text-slate-800 font-medium outline-none" />
        </div>
      </div>

      <div className="p-4 max-w-xl mx-auto">
        {!targetUserId ? (
            <div className="text-center py-10 text-red-400">
                <p>ไม่พบข้อมูลผู้ใช้ (กรุณาระบุ ?uid=...)</p>
            </div>
        ) : loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : activities.length === 0 ? (
            <div className="text-center py-10 text-slate-400"><p>ไม่มีกิจกรรมในวันนี้</p></div>
        ) : (
          <div className="space-y-3 relative">
             <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200 z-0 hidden sm:block"></div>
             {activities.map((act) => (
               <div key={act.id} className="relative z-10 flex gap-3">
                 <div className="w-14 pt-2 text-right flex-shrink-0">
                    <div className="text-sm font-bold text-slate-700">{act.startTime}</div>
                    <div className="text-xs text-slate-400">{act.endTime || "..."}</div>
                 </div>
                 
                 <div className={`flex-1 p-3 rounded-lg shadow-sm border ${TYPE_COLORS[act.type] || TYPE_COLORS.General}`}>
                    <div className="flex justify-between items-start">
                        <h3 className="font-bold">{act.title}</h3>
                        {/* ไม่มีปุ่ม Edit/Delete ในหน้านี้ */}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm mt-1">
                      <div className="flex items-center gap-1 opacity-90"><MapPin size={14} /><span>{act.location}</span></div>
                      {act.coordinates && (<a href={`https://www.google.com/maps/search/?api=1&query=${act.coordinates}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded text-xs font-bold"><ExternalLink size={12} />ดูแผนที่</a>)}
                    </div>
                    
                    {act.details && <p className="text-sm mt-2 opacity-80 whitespace-pre-line">{act.details}</p>}
                    
                    {act.photos?.length > 0 && (
                        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                            {act.photos.map((p: any, idx: number) => (
                                <img key={idx} src={p.url} alt="Log" className="w-16 h-16 object-cover rounded-md border border-slate-300" />
                            ))}
                        </div>
                    )}
                    
                    <div className="mt-2"><span className="text-[10px] uppercase font-bold tracking-wider opacity-60 bg-black/10 px-2 py-0.5 rounded">{act.type}</span></div>
                 </div>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScheduleViewPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400">Loading schedule...</div>}>
      <ScheduleViewContent />
    </Suspense>
  );
}