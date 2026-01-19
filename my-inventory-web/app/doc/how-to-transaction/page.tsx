import Image from 'next/image';
import Link from 'next/link';
import { Kanit } from 'next/font/google';

// ตั้งค่า Font Kanit
const kanit = Kanit({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-kanit',
});

export default function HowToTransactionPage() {
  return (
    <div className={`min-h-screen bg-gray-50 ${kanit.className}`}>
      
      {/* Mobile First Container */}
      <div className="max-w-3xl mx-auto bg-white min-h-screen shadow-sm md:my-8 md:rounded-xl md:shadow-xl overflow-hidden">
        
        {/* --- Header Section --- */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-6 py-12 text-white text-center">
          <h1 className="text-3xl font-bold mb-2">คู่มือการใช้งาน</h1>
          <p className="text-blue-100 text-lg mb-8">ระบบบริหารจัดการคลังสินค้า Siriwong</p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            
            {/* ปุ่มดาวน์โหลดแอป */}
            <a 
              href="/downloads/app-release.apk" 
              download
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-bold py-3 px-6 rounded-full shadow-lg transform hover:scale-105 transition duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              ดาวน์โหลดแอป (.apk)
            </a>

            {/* ปุ่มไปหน้าวิธีติดตั้ง */}
            <Link 
              href="/doc/how-to-install" 
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-medium py-3 px-6 rounded-full backdrop-blur-sm transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              วิธีติดตั้งแอปบนมือถือ
            </Link>
          </div>

          <div>
            <Link 
              href="/" 
              className="inline-flex items-center text-sm text-blue-200 hover:text-white transition"
            >
              ← กลับสู่หน้าหลัก
            </Link>
          </div>
        </div>

        {/* --- Content Body --- */}
        <div className="p-6 md:p-10 space-y-16">

          {/* 1. กลุ่มผู้ใช้งาน */}
          <section id="user-groups">
            <SectionHeader number="1" title="กลุ่มผู้ใช้งาน (User Roles)" />
            <p className="text-gray-600 mb-4 leading-relaxed">
              ระบบแบ่งผู้ใช้งานออกเป็น 2 กลุ่มหลัก เพื่อความปลอดภัยและความถูกต้องของข้อมูล:
            </p>
            
            <div className="grid gap-6 md:grid-cols-2">
              <RoleCard 
                title="Technician / Foreman" 
                desc="เน้นดูยอดคงเหลือ วางแผนการใช้ และทำรายการเบิกของ"
                imageSrc="/doc-images/1-technician.png"
              />
              <RoleCard 
                title="Store Keeper" 
                desc="ผู้จัดการระบบหลัก ดูแลสต๊อก และอนุมัติการเบิก-จ่าย"
                imageSrc="/doc-images/1-Stoe_Keeper.png" 
                isHighlight
              />
            </div>
          </section>

          {/* 2. การเพิ่มสินค้า */}
          <section id="add-product">
            <SectionHeader number="2" title="การเพิ่มสินค้าเข้าสต๊อก" />
            <p className="text-gray-600 mb-6">
              แบ่งเป็น 2 กรณี คือ สินค้าใหม่ที่ไม่เคยมีในระบบ และ สินค้าเดิมที่มีอยู่แล้ว
            </p>

            <SubHeader title="2.1 สินค้าใหม่ (New Product)" />
            <p className="text-gray-600 mb-4">
              ใช้เมนู <code className="bg-gray-100 px-2 py-1 rounded text-red-500">app/product/add</code> สำหรับสินค้าที่ไม่เคยบันทึกมาก่อน
            </p>
            <DocImage src="/doc-images/2-Add new product.png" caption="หน้าจอเพิ่มสินค้าใหม่" />

            <div className="my-8 border-t border-gray-100"></div>

            <SubHeader title="2.2 สินค้าเดิมที่มีอยู่แล้ว" />
            <p className="text-gray-600 mb-4">
              หากมีประวัติสินค้าอยู่แล้ว ระบบจะแจ้งเตือนและให้ลิงก์เพื่อไปแก้ไขจำนวนแทน
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <DocImage src="/doc-images/2-2-1-forward-to-edit.png" caption="ระบบแจ้งเตือนสินค้าซ้ำ" />
              <DocImage src="/doc-images/2-2-2-product-edit.png" caption="หน้าแก้ไขสินค้าเดิม" />
            </div>
            <NoteBox text="ระบบนี้เป็น Multi-Location: สินค้าชนิดเดียวกัน (เช่น เหล็กกล่อง 4x4) สามารถจัดเก็บได้หลายที่ เช่น สโตร์บางเขน หรือ สโตร์สายสอง" />
          </section>

          {/* 3. การเบิกสินค้า */}
          <section id="withdraw">
            <SectionHeader number="3" title="การเบิกสินค้า (Withdraw)" />
            
            <SubHeader title="3.1 การเบิกทั่วไป (Technician/Foreman)" />
            <p className="text-gray-600 mb-4">
              ผู้เบิกต้องสร้าง <strong>ใบคำร้อง (Request)</strong> ผ่านระบบ เพื่อให้ Store Keeper อนุมัติ
            </p>
            <div className="space-y-6">
              <DocImage src="/doc-images/3-1-1-สร้างใบเบิก.png" caption="1. เลือกเมนูสร้างใบเบิก" />
              {/* อิงชื่อไฟล์ตามภาพ 083d9d.png */}
              <DocImage src="/doc-images/3-1-3-creagte-request-tansaction.png" caption="2. ระบุรายการที่ต้องการเบิก" />
              <DocImage src="/doc-images/3-1-4-Request-creation.png" caption="3. ใบเบิกถูกสร้าง รอการอนุมัติ" />
            </div>
            <p className="text-gray-600 mt-4 italic text-sm border-l-4 border-yellow-400 pl-3">
              *หาก Store Keeper ไม่กดอนุมัติ สินค้าจะไม่ถูกตัดออกจากสต๊อก
            </p>

            <div className="my-8 border-t border-gray-100"></div>

            <SubHeader title="3.2 การเบิกด่วน/รับของหน้าร้าน (Store Keeper)" />
            <p className="text-gray-600 mb-4">
              กรณีผู้เบิกมารับของที่หน้าสโตร์โดยตรง Store Keeper สามารถตัดสต๊อกได้ทันที
            </p>
            <div className="grid gap-4">
              {/* อิงชื่อไฟล์ตามภาพ 083d9d.png */}
              <DocImage src="/doc-images/3-2-2-tansaction-create.png" caption="Store Keeper ทำรายการตัดสต๊อกทันที" />
            </div>
          </section>

          {/* 4. การคืนวัสดุ */}
          <section id="return">
            <SectionHeader number="4" title="การคืนวัสดุจากหน้างาน" />
            <p className="text-gray-600 mb-4">
              เมื่อใช้งานเสร็จ หรือมีของเหลือ Technician ต้องสร้างรายการแจ้งคืน
            </p>
            <DocImage src="/doc-images/4-1-1-request-return-creation.png" caption="สร้างรายการแจ้งคืนของ" />
            
            <div className="mt-6">
              <p className="text-gray-600 mb-2">
                จากนั้น Store Keeper จะตรวจสอบสภาพของ และกดรับของเข้าคลัง (เลือก Location เก็บของได้)
              </p>
              <DocImage src="/doc-images/4-1-2-Store_Keeper-approval-return.png" caption="Store Keeper กดรับคืนและเลือกที่จัดเก็บ" />
            </div>
          </section>

          {/* 5. การเคลื่อนย้าย */}
          <section id="transfer">
            <SectionHeader number="5" title="การเคลื่อนย้ายวัสดุ (Transfer)" />
            <p className="text-gray-600 mb-4">
              ไม่ใช่การเบิกไปใช้ แต่เป็นการย้ายจุดเก็บ (เช่น ย้ายจากบางเขน ไป สายสอง)
            </p>
            <div className="space-y-4">
              <DocImage src="/doc-images/5-1-1-menu-about-stock-location.png" caption="เข้าเมนูจัดการ Stock Location" />
              {/* อิงชื่อไฟล์ตามภาพ 083d9d.png */}
              <DocImage src="/doc-images/5-1-3-tranfer step.png" caption="ระบุจำนวนและปลายทางที่ต้องการย้าย" />
            </div>
          </section>

          {/* 6. การปรับปรุงยอด */}
          <section id="adjustment">
            <SectionHeader number="6" title="การปรับปรุงยอดสต๊อก" />
            <p className="text-gray-600 mb-4">
              ใช้เมื่อยอดในระบบไม่ตรงกับของจริง (ของหาย, ชำรุด, หรือนับเกิน) ระบบจะบันทึกประวัติไว้เสมอ
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <DocImage src="/doc-images/6-1-1-menu-transaction-log file.png" caption="เมนูประวัติและปรับปรุงยอด" />
              <DocImage src="/doc-images/6-1-2-select-items.png" caption="เลือกรายการเพื่อปรับปรุงจำนวน" />
            </div>
          </section>

          {/* Footer */}
          <div className="text-center text-gray-400 text-sm py-10 border-t mt-10">
            © 2024 Siriwong Inventory System. All rights reserved.
          </div>

        </div>
      </div>
    </div>
  );
}

// --- Helper Components ---

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <h2 className="flex items-center text-2xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">
      <span className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full text-lg mr-3 shadow-md shrink-0">
        {number}
      </span>
      {title}
    </h2>
  );
}

function SubHeader({ title }: { title: string }) {
  return <h3 className="text-xl font-semibold text-blue-800 mb-3 mt-2">{title}</h3>;
}

function DocImage({ src, caption }: { src: string; caption?: string }) {
  return (
    <div className="group">
      <div className="relative rounded-lg overflow-hidden shadow-md border border-gray-100 bg-gray-50">
        <Image
          src={src}
          alt={caption || 'Documentation Image'}
          width={800} 
          height={500}
          className="w-full h-auto object-cover group-hover:scale-[1.01] transition-transform duration-300"
          unoptimized={true} 
        />
      </div>
      {caption && (
        <p className="text-center text-sm text-gray-500 mt-2 font-light">
          ▲ {caption}
        </p>
      )}
    </div>
  );
}

function RoleCard({ title, desc, imageSrc, isHighlight }: any) {
  return (
    <div className={`p-4 rounded-xl border-2 flex flex-col items-center text-center ${isHighlight ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white'}`}>
      <div className="w-24 h-24 mb-3 relative rounded-full overflow-hidden shadow-sm bg-gray-200">
         <Image src={imageSrc} alt={title} fill className="object-cover" unoptimized={true} />
      </div>
      <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
      <p className="text-sm text-gray-600 mt-1">{desc}</p>
    </div>
  );
}

function NoteBox({ text }: { text: string }) {
  return (
    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
      <span className="text-yellow-600 text-xl">💡</span>
      <p className="text-sm text-yellow-800 leading-relaxed">{text}</p>
    </div>
  );
}