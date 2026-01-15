import { API_URL } from '../constants/Config';

interface TransactionPayload {
  token: string;
  productId: number | string;
  locationId: number | string;
  type: 'in' | 'out' | 'adjust';
  amount: number;
  docNo: string;
  userId?: number | string; // ถ้ามี
  remark?: string;
}

export const createTransaction = async ({
  token, productId, locationId, type, amount, docNo, userId, remark
}: TransactionPayload) => {
  try {
    // ป้องกันค่า Null ที่อาจหลุดมา
    if (!productId || !locationId) {
        console.error("❌ Transaction Failed: Missing Product or Location ID");
        return;
    }

    const payload = {
      data: {
        product: productId,
        location: locationId,
        type: type,
        amount: amount,
        doc_no: docNo,
        action_by: userId,
        remark: remark || '-',
        // date จะถูกสร้าง auto โดย created_at ของ strapi
      }
    };

    const response = await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      // แปลง Error Object เป็น String ให้ดูง่ายใน Log
      console.error("Transaction Error Detail:", JSON.stringify(error, null, 2));
    } else {
      console.log(`✅ Transaction Recorded: ${type} ${amount} @ ${docNo} (Loc: ${locationId})`);
    }
  } catch (error) {
    console.error("Create Transaction Failed:", error);
  }
};