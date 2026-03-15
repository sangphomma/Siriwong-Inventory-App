"use client";

import React, { useMemo } from 'react';

interface SmartInputProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  suggestions?: string[]; 
  multiline?: boolean;    
  rows?: number;
  className?: string;     
  isError?: boolean;      
}

export const SmartInput: React.FC<SmartInputProps> = ({
  label, value, onValueChange, placeholder,
  suggestions = [], multiline = false, rows = 4, className = '', isError = false,
}) => {
  
  // ✨ LOGIC ใหม่: กรองคำแนะนำตามสิ่งที่พิมพ์ (Case-insensitive)
  const filteredSuggestions = useMemo(() => {
    if (!value) return suggestions; // ถ้ายังไม่พิมพ์อะไร โชว์ทั้งหมด
    
    // ดึงคำล่าสุดที่กำลังพิมพ์ (แยกด้วย spacebar เผื่อพิมพ์หลายคำ)
    const words = value.split(' ');
    const lastWord = words[words.length - 1].toLowerCase();

    if (!lastWord) return suggestions;

    // กรองหา Chip ที่มีตัวอักษรตรงกับคำที่กำลังพิมพ์
    return suggestions.filter(s => s.toLowerCase().includes(lastWord));
  }, [value, suggestions]);

  const handleSuggestionClick = (word: string) => {
    if (!value) {
      onValueChange(word);
      return;
    }

    // ลบคำไกด์ที่พิมพ์ค้างไว้ออก แล้วแทนที่ด้วยคำจาก Chip ให้เนียนๆ
    const words = value.split(' ');
    words.pop(); // เอาคำสุดท้ายที่พิมพ์ค้างไว้ออก
    const newValue = words.length > 0 ? `${words.join(' ')} ${word} ` : `${word} `;
    
    onValueChange(newValue);
  };

  const baseStyle = "w-full p-4 font-medium text-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 shadow-sm transition-colors";
  const stateStyle = isError 
    ? "bg-red-50 border border-red-300 text-red-700 placeholder:text-red-400 focus:ring-red-200" 
    : "bg-white border border-slate-200 focus:ring-slate-400 placeholder:text-slate-400";

  return (
    <div className="w-full">
      {label && <label className="text-xs font-bold text-slate-500 ml-1 block mb-2">{label}</label>}
      
      {multiline ? (
        <textarea
          value={value} onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder} rows={rows}
          className={`${baseStyle} ${stateStyle} resize-none ${className}`}
        />
      ) : (
        <input
          type="text" value={value} onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder} className={`${baseStyle} ${stateStyle} ${className}`}
        />
      )}

      {/* ✨ โซน Quick Tap Chips (จะเปลี่ยนไปตามคำที่พิมพ์) ✨ */}
      <div className="flex flex-wrap gap-2 mt-2 transition-all min-h-[30px]">
        {filteredSuggestions.length > 0 ? (
          filteredSuggestions.map((word, index) => (
             <button
                key={index} type="button" onClick={() => handleSuggestionClick(word)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded-full border border-slate-200 transition-transform active:scale-95 flex items-center gap-1 shadow-sm"
             >
                <span className="text-blue-500">+</span> {word}
             </button>
          ))
        ) : (
          <span className="text-xs text-slate-400 italic px-2">ไม่พบคำแนะนำ (กดบันทึกเพื่อเพิ่มคำนี้เป็นคำใหม่)</span>
        )}
      </div>
    </div>
  );
};