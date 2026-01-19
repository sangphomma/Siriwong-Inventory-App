import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 font-sans">
      {/* 1. ส่วน Header ด้านบน */}
      <header className="bg-indigo-600 text-white py-12 px-6 shadow-lg">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold mb-2">🚀 Siriwong Inventory</h1>
          <p className="text-indigo-100 text-lg">ระบบจัดการคลังสินค้าและคู่มือการใช้งานออนไลน์</p>
        </div>
      </header>

      {/* 2. ส่วนเนื้อหา (Grid เมนู) */}
      <div className="max-w-4xl mx-auto -mt-8 px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* การ์ดที่ 1: คู่มือการใช้งาน (ลิงก์ไปหน้าที่เราเพิ่งทำ) */}
          <Link href="/doc/how-to-transaction" className="group">
            <div className="bg-white rounded-xl shadow-md p-8 border-l-8 border-indigo-500 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer h-full">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-indigo-100 p-3 rounded-full text-2xl">📚</div>
                <h2 className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                  คู่มือการเบิกสินค้า
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                ดูขั้นตอนการใช้งาน Application วิธีการเบิกจ่ายสินค้า การค้นหา Smart Suggestion และการตัดสต็อก
              </p>
              <div className="mt-6 flex items-center text-indigo-600 font-semibold group-hover:translate-x-2 transition-transform">
                อ่านคู่มือเลย &rarr;
              </div>
            </div>
          </Link>

          {/* การ์ดที่ 2: เมนูสำหรับ Admin (เตรียมไว้สำหรับอนาคต) */}
          <a href="http://siriwong.online:1337/admin" target="_blank" className="group">
            <div className="bg-white rounded-xl shadow-md p-8 border-l-8 border-slate-400 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer h-full">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-slate-100 p-3 rounded-full text-2xl">⚙️</div>
                <h2 className="text-xl font-bold text-gray-800 group-hover:text-slate-600 transition-colors">
                  จัดการระบบหลังบ้าน (Strapi)
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                เข้าสู่ระบบจัดการฐานข้อมูล (Database), เพิ่ม/ลบ User, และจัดการข้อมูลสินค้าผ่านหน้าเว็บ Admin
              </p>
              <div className="mt-6 flex items-center text-slate-500 font-semibold group-hover:translate-x-2 transition-transform">
                ไปที่ Strapi Admin &rarr;
              </div>
            </div>
          </a>

        </div>

        {/* 3. ส่วน Footer ข้อมูลโปรเจกต์ */}
        <div className="mt-12 text-center text-gray-400 text-sm">
          <p>© 2026 Siriwong Kansard. All rights reserved.</p>
          <p className="mt-1">Powered by Next.js & Strapi v5</p>
        </div>
      </div>
    </main>
  );
}