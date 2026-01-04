/**
 * withdrawal-request controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::withdrawal-request.withdrawal-request', ({ strapi }) => ({
  async create(ctx) {
    // 1. ดึงข้อมูล User จาก Token (คนที่ล็อกอินอยู่)
    const user = ctx.state.user;

    if (!user) {
        return ctx.unauthorized("กรุณาล็อกอินก่อนทำรายการ");
    }

    // 2. ดึงข้อมูลที่ส่งมาจากแอป (Job No, Site, Items)
    const { data } = ctx.request.body;

    // 3. "ท่าไม้ตาย": ยิงข้อมูลลง Database โดยตรง (ข้าม Validator ที่กำลังเอ๋อ)
    try {
      const newEntry = await strapi.documents('api::withdrawal-request.withdrawal-request').create({
        data: {
          ...data, // เอาข้อมูลจากแอปมาใส่
          request_by: user.documentId, // ⭐ Server แปะบัตรประชาชนให้เองตรงนี้! (ชัวร์แน่นอน)
          //publishedAt: null, // บันทึกเป็น Draft ก่อน (หรือลบบรรทัดนี้ถ้าอยากให้ Publish เลย)
        },
        status: 'published', // บังคับ Publish เลยเพื่อให้เห็นในรายการ
      });

      // 4. ส่งผลลัพธ์กลับไปบอกแอปว่า "สำเร็จ!"
      const sanitizedEntity = await this.sanitizeOutput(newEntry, ctx);
      return this.transformResponse(sanitizedEntity);

    } catch (error) {
      // ถ้ามี Error ให้ส่งกลับไปบอก
      ctx.badRequest("เกิดข้อผิดพลาดในการบันทึก", { moreDetails: error });
    }
  },

  async update(ctx) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;

    // 1. ตรวจสอบก่อนว่ามีการเปลี่ยนสถานะเป็น 'approved' หรือไม่
    if (data.request_status === 'approved') {
      // ดึงข้อมูลใบเบิกนี้ขึ้นมาดูว่าเบิกอะไรไปบ้าง
      const entry = await strapi.documents('api::withdrawal-request.withdrawal-request').findOne({
        documentId: id,
        populate: ['items.product'],
      });

      if (entry && entry.request_status !== 'approved') {
        // 2. Loop ตัดสต็อกสินค้าทีละรายการ
        for (const item of entry.items) {
          if (item.product && item.qty_request) {
            const currentStock = item.product.stock || 0;
            const newStock = currentStock - item.qty_request;

            // อัปเดตสต็อกที่ตาราง product
            await strapi.documents('api::product.product').update({
              documentId: item.product.documentId,
              data: { stock: newStock },
            });
          }
        }
      }
    }

    // 3. เรียกใช้งานฟังก์ชัน update เดิมของ Strapi เพื่อเปลี่ยนสถานะใบเบิก
    const response = await super.update(ctx);
    return response;
  },

}));