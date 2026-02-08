"use client";

import React from "react";

// ไอคอนสวยๆ (ใช้ SVG เพื่อความเบา)
const Icons = {
  Timeline: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-blue-600"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.75 3c1.916 0 3.638.912 4.743 2.327A6.476 6.476 0 0117.25 3c3.036 0 5.5 2.322 5.5 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>,
  Gallery: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-emerald-600"><path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" /></svg>,
  Material: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-amber-600"><path d="M12.378 1.602a.75.75 0 00-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03zM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 00.372-.648V7.93zM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 00.372.648l8.628 5.033z" /></svg>,
  Settings: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-slate-600"><path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.922-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" /></svg>,
};

interface ProjectMenuProps {
  activeTab: string;
  onChange: (tab: string) => void;
}

export default function ProjectMenu({ activeTab, onChange }: ProjectMenuProps) {
  const menus = [
    { id: 'dashboard', label: 'ภาพรวมงาน', icon: Icons.Timeline, color: 'bg-blue-50 text-blue-700' },
    { id: 'gallery', label: 'อัลบั้มรูป', icon: Icons.Gallery, color: 'bg-emerald-50 text-emerald-700' },
    { id: 'material', label: 'เบิกวัสดุ', icon: Icons.Material, color: 'bg-amber-50 text-amber-700' },
    { id: 'info', label: 'ข้อมูลโครงการ', icon: Icons.Settings, color: 'bg-slate-100 text-slate-700' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 px-4 mb-6 -mt-8 relative z-20">
      {menus.map((menu) => {
        const isActive = activeTab === menu.id;
        return (
          <button
            key={menu.id}
            onClick={() => onChange(menu.id)}
            className={`
              flex flex-col items-center justify-center p-4 rounded-[1.5rem] transition-all duration-300
              ${isActive 
                ? 'bg-white shadow-lg scale-[1.02] border-2 border-blue-500/20 ring-4 ring-blue-50' 
                : 'bg-white/80 border border-slate-100 shadow-sm hover:bg-white'
              }
            `}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 ${menu.color} ${isActive ? 'shadow-inner' : ''}`}>
              <menu.icon />
            </div>
            <span className={`text-sm font-black tracking-tight ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
              {menu.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}