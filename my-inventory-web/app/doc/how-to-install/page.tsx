import Link from 'next/link';
import { Kanit } from 'next/font/google';

const kanit = Kanit({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '600'],
  variable: '--font-kanit',
});

export default function InstallGuidePage() {
  return (
    <div className={`min-h-screen bg-gray-50 flex items-center justify-center p-4 ${kanit.className}`}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
        
        {/* Icon ก่อสร้าง/ซ่อมแซม */}
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          อยู่ระหว่างดำเนินการ
        </h1>
        <p className="text-gray-500 mb-8">
          คู่มือ "วิธีการติดตั้งแอปพลิเคชัน" กำลังอยู่ระหว่างการจัดทำเนื้อหา 
          เพื่อให้คุณสามารถติดตั้งบน Android ได้อย่างราบรื่น
        </p>

        <div className="space-y-3">
          <button 
            disabled 
            className="w-full py-3 px-4 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed"
          >
            Coming Soon...
          </button>
          
          <Link 
            href="/doc/how-to-transaction" 
            className="block w-full py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            กลับไปหน้าคู่มือการใช้งาน
          </Link>
        </div>

      </div>
    </div>
  );
}