
//export const STRAPI_URL = 'http://192.168.1.49:1337'; 
//export const STRAPI_URL = 'http://localhost:1337';


// services/api.ts
import axios from 'axios';
import qs from 'qs';

//export const STRAPI_URL = 'https://siriwong.online';
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
// services/api.ts

// แก้ไขฟังก์ชัน getAllProjects
export const getAllProjects = async () => {
  const query = {
    populate: {
      jobs: {
        populate: {
          job_tasks: {
            fields: ['progress'] // ✅ ดึงเฉพาะ field progress ของลูกหลานมาคำนวณ (ประหยัด data)
          }
        }
      }
    },
    sort: ['createdAt:desc']
  };
  
  const response = await axios.get(`${API_URL}/project-sites`, {
    params: query,
    paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
  });

  return response.data.data.map(normalizeStrapiData);
};

// 2. ฟังก์ชันดึงงานของโครงการ (ใช้ตอนกดเข้าโครงการ)
// 1. อัปเดต fetchProjectJobs ให้ดึง Team และ Dates มาด้วย
// services/api.ts

// ✅ แก้ไข: กลับมาใช้วิธีดึงทั้งหมดแล้วหาตัวที่ตรงกัน (เสถียรกว่าสำหรับ v5)
export const fetchProjectJobs = async (projectDocId: string) => {
  try {
    const query = {
      populate: {
        jobs: { 
          populate: {
             job_tasks: { populate: ['task_logs'] } // ดึง Task และ Log ย่อย
          }
        },
        team_members: {
          fields: ['username', 'email'] // ✅ เจาะจง field เพื่อป้องกัน Error 400 จาก Permission
        }
      },
      publicationState: 'preview', // ดึง Draft ด้วย
      sort: ['createdAt:desc']
    };

    // ดึงมาทั้งหมดก่อน
    const response = await axios.get(`${API_URL}/project-sites`, {
      params: query,
      paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
    });

    const allProjects = response.data.data.map(normalizeStrapiData);
    
    // ค้นหา Project ที่มี documentId ตรงกับที่เราต้องการ
    const foundProject = allProjects.find((p: any) => p.documentId === projectDocId);
    
    return foundProject || null;
  } catch (error) {
    console.error("Error in fetchProjectJobs:", error);
    throw error;
  }
};
// 2. สร้าง Project ใหม่ (Level 1 - Home)
export const createProject = async (data: { name: string, location: string, distance: string, start: string, end: string, coordinates: string }) => {
  return await axios.post(`${API_URL}/project-sites`, {
    data: {
      name: data.name,
      // ใช้ || null ดักท้าย เพื่อแปลง "" ให้เป็น null (Strapi จะยอมรับได้)
      location: data.location || null,      
      coordinates: data.coordinates || null, 
      distance_from_branch: data.distance || null,
      
      // ✅ จุดสำคัญ: ถ้า string ว่าง ให้ส่ง null ไปเลย ห้ามส่ง "" เด็ดขาดสำหรับช่อง Date
      start_date: data.start ? data.start : null, 
      end_date: data.end ? data.end : null      
    }
  });
};
// 3. ลบ Project
export const deleteProject = async (projectDocId: string) => {
    return await axios.delete(`${API_URL}/project-sites/${projectDocId}`);
};

// 2.5 แก้ไข Project (Level 1 - Home) -- เพิ่มใหม่ --
export const updateProject = async (projectDocId: string, data: { name: string, location: string, distance: string, start: string, end: string, coordinates: string }) => {
  return await axios.put(`${API_URL}/project-sites/${projectDocId}`, {
    data: {
      name: data.name,
      // Logic เดิม: แปลง "" เป็น null เพื่อไม่ให้ Strapi Error
      location: data.location || null,      
      coordinates: data.coordinates || null, 
      distance_from_branch: data.distance || null,
      start_date: data.start ? data.start : null, 
      end_date: data.end ? data.end : null      
    }
  });
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
// แก้ไข createTaskLog ให้เรียกฟังก์ชันคำนวณใหม่
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

    // ✅ เปลี่ยนตรงนี้: เรียกฟังก์ชันคำนวณค่าเฉลี่ย แทนการส่งค่าตรงๆ
    await recalculateTaskProgress(jobTaskDocId);

    return response.data;
  } catch (error: any) {
    throw error;
  }
};
// แก้ไข updateTaskLog ให้ Sync Auto
// แก้ไข updateTaskLog ให้เรียกฟังก์ชันคำนวณใหม่
export const updateTaskLog = async (logDocumentId: string, data: any, existingMediaIds: number[], jobTaskDocId: string) => {
  try {
    let newMediaIds: any[] = [];
    if (data.photos && data.photos.length > 0) {
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

    // ✅ เปลี่ยนตรงนี้: เรียกฟังก์ชันคำนวณค่าเฉลี่ย (ต้องมี jobTaskDocId)
    if (jobTaskDocId) {
      await recalculateTaskProgress(jobTaskDocId);
    }

    return response.data;
  } catch (error: any) {
    throw error;
  }
};

// ลบ Log (เหมือนเดิม)
// ลบ Log ก็ต้องคำนวณใหม่ด้วย!
export const deleteTaskLog = async (logDocumentId: string, jobTaskDocId: string) => {
  await axios.delete(`${API_URL}/task-logs/${logDocumentId}`);
  // ✅ เพิ่ม: คำนวณค่าเฉลี่ยใหม่หลังลบ
  if (jobTaskDocId) {
      await recalculateTaskProgress(jobTaskDocId);
  }
};


// ==========================================
// 🚀 ZONE: จัดการ Job (หมวดงาน Level 1)
// ==========================================

// 1. สร้าง Job ใหม่
export const createJob = async (title: string, projectDocId: string) => {
  // หมายเหตุ: project_site คือชื่อ Field Relation ที่ Job ผูกกับ ProjectSite (อาจต้องเช็คใน Strapi ว่าชื่อ field นี้ไหม ถ้าชื่ออื่นให้แก้ตรงนี้)
  return await axios.post(`${API_URL}/jobs`, {
    data: {
      title: title,
      project_site: projectDocId, 
      progress: 0
    }
  });
};

// 2. แก้ไข Job (รับ data เป็น object เพื่อให้แก้ Title หรือ Progress ก็ได้)
export const updateJob = async (jobDocId: string, data: { title?: string, progress?: number }) => {
  return await axios.put(`${API_URL}/jobs/${jobDocId}`, {
    data: {
      title: data.title,       // ถ้าส่ง title มาก็แก้ title
      progress: data.progress  // ถ้าส่ง progress มาก็แก้ progress
    }
  });
};

// 3. ลบ Job
export const deleteJob = async (jobDocId: string) => {
  return await axios.delete(`${API_URL}/jobs/${jobDocId}`);
};

// ==========================================
// 🚀 ZONE: Auto Sync Progress (Log -> Parent)
// ==========================================

// ✅ ฟังก์ชันใหม่: คำนวณค่าเฉลี่ยจากทุก Log แล้วอัปเดต JobTask
const recalculateTaskProgress = async (jobTaskDocId: string) => {
  try {
    // 1. ดึงข้อมูล Task และ Logs ทั้งหมดมาก่อน
    // (ใช้ fetchTaskWithLogs ที่เรามีอยู่แล้ว หรือยิง query ใหม่ก็ได้)
    const query = {
      populate: {
        task_logs: {
          fields: ['progress_percentage'] 
        }
      }
    };
    const response = await axios.get(`${API_URL}/job-tasks/${jobTaskDocId}`, {
        params: query,
        paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
    });
    
    const taskData = normalizeStrapiData(response.data.data);
    const logs = taskData.task_logs || [];

    // 2. คำนวณค่าเฉลี่ย (Average)
    let newProgress = 0;
    if (logs.length > 0) {
      const total = logs.reduce((sum: number, log: any) => sum + (log.progress_percentage || 0), 0);
      newProgress = Math.round(total / logs.length);
    }

    // 3. อัปเดตกลับไปที่ JobTask
    await axios.put(`${API_URL}/job-tasks/${jobTaskDocId}`, {
      data: { progress: newProgress }
    });

    console.log(`🔄 Recalculated Task Progress: ${newProgress}% (from ${logs.length} logs)`);
    return newProgress;

  } catch (error) {
    console.error("⚠️ Failed to recalculate task progress", error);
  }
};
