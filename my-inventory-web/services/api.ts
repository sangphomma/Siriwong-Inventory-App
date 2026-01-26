// services/api.ts
import axios from 'axios';
import qs from 'qs';

//export const STRAPI_URL = 'http://192.168.1.49:1337'; 
export const STRAPI_URL = 'http://localhost:1337';
const API_URL = `${STRAPI_URL}/api`;

// services/api.ts
const normalizeStrapiData = (data: any): any => {
  if (!data || data._isNormalized) return data; // ✅ ป้องกันการวนลูปซ้ำ

  const normalized: any = {
    id: data.id,
    documentId: data.documentId,
    ...data.attributes,
    ...data,
    _isNormalized: true // ✅ ทำเครื่องหมายว่าจัดการแล้ว
  };

  // ดึง Relation สำคัญเหมือนที่ทำใน Expo
  const relations = ['jobs', 'job_tasks', 'task_logs', 'Media'];
  relations.forEach(key => {
    const target = data[key] || (data.attributes && data.attributes[key]);
    if (target && target.data) {
      normalized[key] = Array.isArray(target.data) 
        ? target.data.map((item: any) => normalizeStrapiData(item))
        : normalizeStrapiData(target.data);
    }
  });
  return normalized;
};

// ✅ เพิ่มฟังก์ชันที่หน้าแรกเรียกใช้
export const getAllProjects = async () => {
  const response = await axios.get(`${API_URL}/project-sites`, {
    params: { populate: '*', sort: ['createdAt:desc'] }
  });
  return response.data.data.map(normalizeStrapiData);
};

export const fetchJobDetailsById = async (jobId: string) => {
  if (!jobId || jobId === 'undefined') return null;
  const query = {
    populate: { job_tasks: { populate: { task_logs: { populate: ['Media'] } } } }
  };
  const response = await axios.get(`${API_URL}/jobs/${jobId}`, {
    params: query,
    paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
  });
  return normalizeStrapiData(response.data.data);
};

export const createJobTask = async (taskName: string, jobDocId: string) => {
  return await axios.post(`${API_URL}/job-tasks`, { 
    data: { task_name: taskName, job: jobDocId, job_status: 'Pending' } 
  });
};

// services/api.ts

export const fetchProjectJobs = async (projectId: string) => {
  try {
    const query = {
      populate: {
        jobs: { 
          populate: ['job_tasks'] 
        }
      },
      // ✅ ขอข้อมูลสถานะ Draft มาด้วยเผื่อลืมกด Publish
      publicationState: 'preview' 
    };

    // ❌ ไม่ใช้: ${API_URL}/project-sites/${projectId} เพราะจะติดปัญหา 404
    // ✅ ใช้: ดึงรายการทั้งหมดแล้วมา Filter หา ID: 30 เอง
    const response = await axios.get(`${API_URL}/project-sites`, {
      params: query,
      paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
    });

    const allProjects = response.data.data.map(normalizeStrapiData);
    
    // ค้นหาโครงการที่มี ID ตรงกับ 30
    const foundProject = allProjects.find((p: any) => String(p.id) === String(projectId));
    
    return foundProject || null;
  } catch (error) {
    console.error("Error in fetchProjectJobs:", error);
    throw error;
  }
};

// ✅ เพิ่มฟังก์ชันนี้ต่อท้ายใน services/api.ts
export const fetchTaskWithLogs = async (taskDocumentId: string) => {
  const query = {
    populate: {
      task_logs: {
        populate: ['Media'],
        sort: ['createdAt:desc']
      }
    }
  };
  const response = await axios.get(`${API_URL}/job-tasks/${taskDocumentId}`, {
    params: query,
    paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
  });
  return normalizeStrapiData(response.data.data);
};

// services/api.ts
// services/api.ts

export const createTaskLog = async (jobTaskDocId: string, data: any) => {
  try {
    let mediaIds: any[] = [];

    // --- STEP 1: ถ้ามีรูปภาพ ให้ Upload ไปเก็บก่อน ---
    if (data.photos && data.photos.length > 0) {
      console.log("🚀 Step 1: Uploading images...");
      
      // สร้าง Promise เพื่ออัปโหลดทีละรูป (ทำพร้อมกันแบบ Parallel)
      const uploadPromises = data.photos.map(async (file: File) => {
        const formData = new FormData();
        formData.append('files', file); // ชื่อ field มาตรฐานของ Strapi Upload คือ 'files'

        // ยิงไปที่ Endpoint Upload โดยตรง
        const uploadRes = await axios.post(`${API_URL}/upload`, formData);
        return uploadRes.data[0]; // Strapi จะส่ง Array กลับมา เราเอาตัวแรก
      });

      // รอจนครบทุกรูป
      const uploadedFiles = await Promise.all(uploadPromises);
      
      // ดึง ID ของรูปมาเก็บไว้
      mediaIds = uploadedFiles.map((f: any) => f.id);
      console.log("✅ Uploaded IDs:", mediaIds);
    }

    // --- STEP 2: สร้าง TaskLog (ส่ง JSON 100%) ---
    console.log("🚀 Step 2: Creating TaskLog...");

    const payload = {
      data: {
        Description: String(data.description || ""), 
        Log_Type: "Progress",
        job_task: jobTaskDocId, // ใช้ Document ID
        Media: mediaIds,        // ✅ แนบ ID รูปภาพที่ได้จาก Step 1 (ถ้าไม่มีจะเป็น [])
      }
    };

    // ส่งเป็น JSON ปกติ (ไม่ต้องใช้ FormData แล้ว)
    const response = await axios.post(`${API_URL}/task-logs`, payload);
    
    console.log("🎉 TaskLog Created Success!");
    return response.data;

  } catch (error: any) {
    // ดึง Error มาดูให้ชัดเจน
    const strapiError = error.response?.data?.error;
    console.error("❌ Operation Failed:", JSON.stringify(strapiError, null, 2));
    throw new Error(strapiError?.message || "Failed to create task log");
  }
};