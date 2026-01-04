import Link from "next/link";
import WithdrawForm from "./WithdrawForm"; // 👈 นำเข้าฟอร์มที่เราเพิ่งสร้าง

// ฟังก์ชันดึงสินค้า (Server Side)
async function getProducts() {
  try {
    const res = await fetch("http://localhost:1337/api/products", { cache: "no-store" });
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    return [];
  }
}

export default async function WithdrawPage() {
  // ดึงข้อมูลสินค้าเตรียมไว้ให้ฟอร์ม
  const products = await getProducts();

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h1 className="text-2xl font-bold text-indigo-600">📝 ทำรายการเบิกสินค้า</h1>
            <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
                ← กลับหน้าหลัก
            </Link>
        </div>

        {/* เรียกใช้ Component ฟอร์ม และส่งรายชื่อสินค้าเข้าไป */}
        <WithdrawForm products={products} />

      </div>
    </main>
  );
}