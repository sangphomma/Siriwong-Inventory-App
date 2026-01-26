
//export const STRAPI_URL = 'http://192.168.1.49:1337'; 
//export const STRAPI_URL = 'http://localhost:1337';


// services/api.ts
import axios from 'axios';
import qs from 'qs';

// export const STRAPI_URL = 'https://siriwong.online';
export const STRAPI_URL = 'http://192.168.1.49:1337';
const API_URL = `${STRAPI_URL}/api`;

// ... (ฟังก์ชัน normalizeStrapiData เก็บไว้เหมือนเดิม) ...
const normalizeStrapiData = (data: any): any => {
  if (!data || data._isNormalized) return data;
  const normalized: any = {
    id: data.id,
    documentId: data.documentId,
    ...data.attributes,
    ...data,
    _isNormalized: true
  };
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

// ... (ฟังก์ชัน fetch เดิม เก็บไว้) ...
// 1. ฟังก์ชันดึงโครงการทั้งหมด (ใช้ที่หน้าแรก)
export const getAllProjects = async () => {
  const response = await axios.get(`${API_URL}/project-sites`, {
    params: { populate: '*', sort: ['createdAt:desc'] }
  });
  // ต้องมี return ตรงนี้ครับ
  return response.data.data.map(normalizeStrapiData);
};

// 2. ฟังก์ชันดึงงานของโครงการ (ใช้ตอนกดเข้าโครงการ)
export const fetchProjectJobs = async (projectId: string) => {
  try {
    const query = {
      populate: {
        jobs: { 
          populate: ['job_tasks'] 
        }
      },
      publicationState: 'preview' 
    };

    const response = await axios.get(`${API_URL}/project-sites`, {
      params: query,
      paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
    });

    const allProjects = response.data.data.map(normalizeStrapiData);
    const foundProject = allProjects.find((p: any) => String(p.id) === String(projectId));
    
    // ต้องมี return ตรงนี้ครับ
    return foundProject || null;
  } catch (error) {
    console.error("Error in fetchProjectJobs:", error);
    throw error;
  }
};
// ✅ แก้ไข: ดึงข้อมูล Job Detail
export const fetchJobDetailsById = async (jobId: string) => {
  if (!jobId || jobId === 'undefined') return null;
  const query = {
    populate: { 
      job_tasks: { 
        populate: { 
          task_logs: { populate: ['Media'], sort: ['createdAt:desc'] } // ดึง Log ล่าสุดมาด้วย
        } 
      } 
    }
  };
  const response = await axios.get(`${API_URL}/jobs/${jobId}`, {
    params: query,
    paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
  });
  return normalizeStrapiData(response.data.data);
};
// 3. ฟังก์ชันดึงรายละเอียดงาน + Logs (ใช้หน้า Level 3)
export const fetchTaskWithLogs = async (taskDocumentId: string) => {
  try {
    const query = {
      populate: {
        task_logs: {
          populate: ['Media'], // ดึงรูปภาพมาด้วย
          sort: ['createdAt:desc'] // เรียงจากใหม่ไปเก่า
        }
      }
    };
    
    // ยิงไปที่ job-tasks ตามด้วย Document ID
    const response = await axios.get(`${API_URL}/job-tasks/${taskDocumentId}`, {
        params: query,
        paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
    });
    
    return normalizeStrapiData(response.data.data);
  } catch (error) {
    console.error("Error fetching task logs:", error);
    throw error;
  }
};
// ==========================================
// 🚀 ZONE: จัดการ JobTask (Edit / Delete)
// ==========================================

// 1. สร้าง JobTask ใหม่
export const createJobTask = async (taskName: string, jobDocId: string, quantity: number, unit: string) => {
  return await axios.post(`${API_URL}/job-tasks`, { 
    data: { 
      task_name: taskName, 
      job: jobDocId, 
      quantity: Number(quantity),
      unit: unit,
      progress: 0,
      job_status: 'Pending' 
    } 
  });
};

// 2. แก้ไข JobTask (ชื่อ, เป้าหมาย)
export const updateJobTask = async (taskDocId: string, data: any) => {
  return await axios.put(`${API_URL}/job-tasks/${taskDocId}`, {
    data: {
      task_name: data.task_name,
      quantity: Number(data.quantity),
      unit: data.unit
    }
  });
};

// 3. ลบ JobTask
export const deleteJobTask = async (taskDocId: string) => {
  return await axios.delete(`${API_URL}/job-tasks/${taskDocId}`);
};


// ==========================================
// 🚀 ZONE: Auto Sync Progress (Log -> Parent)
// ==========================================

// Helper: อัปเดต % ของแม่ (JobTask) ให้เท่ากับลูก
const syncParentProgress = async (jobTaskDocId: string, progress: number) => {
  try {
    await axios.put(`${API_URL}/job-tasks/${jobTaskDocId}`, {
      data: { progress: progress }
    });
    console.log(`🔄 Synced parent progress to ${progress}%`);
  } catch (error) {
    console.error("⚠️ Failed to sync parent progress", error);
  }
};

// แก้ไข createTaskLog ให้ Sync Auto
export const createTaskLog = async (jobTaskDocId: string, data: any) => {
  try {
    let mediaIds: any[] = [];
    if (data.photos && data.photos.length > 0) {
      const uploadPromises = data.photos.map(async (file: File) => {
        const formData = new FormData();
        formData.append('files', file); 
        const uploadRes = await axios.post(`${API_URL}/upload`, formData);
        return uploadRes.data[0];
      });
      const uploadedFiles = await Promise.all(uploadPromises);
      mediaIds = uploadedFiles.map((f: any) => f.id);
    }

    const payload = {
      data: {
        Description: String(data.description || ""), 
        Log_Type: "Progress",
        job_task: jobTaskDocId,
        Media: mediaIds,
        progress_percentage: Number(data.progress || 0), 
        problems_found: data.problems || "" 
      }
    };

    const response = await axios.post(`${API_URL}/task-logs`, payload);

    // ✅ เพิ่มบรรทัดนี้: อัปเดตแม่ทันที
    if (data.progress !== undefined) {
      await syncParentProgress(jobTaskDocId, Number(data.progress));
    }

    return response.data;
  } catch (error: any) {
    throw error;
  }
};

// แก้ไข updateTaskLog ให้ Sync Auto
export const updateTaskLog = async (logDocumentId: string, data: any, existingMediaIds: number[], jobTaskDocId: string) => {
  try {
    let newMediaIds: any[] = [];
    if (data.photos && data.photos.length > 0) {
       /* ...เหมือนเดิม... */
       const uploadPromises = data.photos.map(async (file: File) => {
        const formData = new FormData();
        formData.append('files', file); 
        const uploadRes = await axios.post(`${API_URL}/upload`, formData);
        return uploadRes.data[0];
      });
      const uploadedFiles = await Promise.all(uploadPromises);
      newMediaIds = uploadedFiles.map((f: any) => f.id);
    }

    const finalMediaIds = [...existingMediaIds, ...newMediaIds];
    const payload = {
      data: {
        Description: String(data.description || ""), 
        Media: finalMediaIds, 
        progress_percentage: Number(data.progress || 0), 
        problems_found: data.problems || "" 
      }
    };

    const response = await axios.put(`${API_URL}/task-logs/${logDocumentId}`, payload);

    // ✅ เพิ่มบรรทัดนี้: อัปเดตแม่ทันที (ต้องส่ง jobTaskDocId มาด้วย)
    if (data.progress !== undefined && jobTaskDocId) {
      await syncParentProgress(jobTaskDocId, Number(data.progress));
    }

    return response.data;
  } catch (error: any) {
    throw error;
  }
};

// ลบ Log (เหมือนเดิม)
export const deleteTaskLog = async (logDocumentId: string) => {
  await axios.delete(`${API_URL}/task-logs/${logDocumentId}`);
};