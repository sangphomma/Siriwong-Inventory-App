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
      console.error("Transaction Error:", error);
    } else {
      console.log(`✅ Transaction Recorded: ${type} ${amount} @ ${docNo}`);
    }
  } catch (error) {
    console.error("Create Transaction Failed:", error);
  }
};