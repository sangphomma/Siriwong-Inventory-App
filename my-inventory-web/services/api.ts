// services/api.ts

import axios from 'axios';
import qs from 'qs';
import { getToken } from './auth'; // ✅ ดึง Token จาก cookie
import { STRAPI_URL } from './config'; // ✅ เพิ่มบรรทัดนี้: ดึงจากไฟล์กลาง

// ==========================================
// 🌍 CONFIG & INSTANCE
// ==========================================


const API_URL = `${STRAPI_URL}/api`;

// 🚀 สร้าง Axios Instance ใหม่ (แทนการใช้ axios.get ตรงๆ)
const apiClient = axios.create({
  baseURL: API_URL,
});

// 🛡️ Interceptor: ฝัง Token อัตโนมัติทุกครั้งที่ยิง Request
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));


// ==========================================
// 🛠️ HELPER FUNCTIONS
// ==========================================

const normalizeStrapiData = (data: any): any => {
  if (!data || data._isNormalized) return data;
  const normalized: any = {
    id: data.id,
    documentId: data.documentId,
    ...data.attributes,
    ...data,
    _isNormalized: true
  };
  
  // รายชื่อ field ที่เป็น Relation ต้อง normalize ซ้ำลงไป
  const relations = ['jobs', 'job_tasks', 'task_logs', 'Media', 'creator', 'team_members'];
  
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

// ✅ เพิ่มฟังก์ชันดึงรายชื่อ User ทั้งหมด
export const getAllUsers = async () => {
  const response = await apiClient.get('/users');
  return response.data;
};


// ==========================================
// 🏗️ PROJECT SITES (Level 0)
// ==========================================

export const getAllProjects = async () => {
  const query = {
    populate: {
      creator: { fields: ['username', 'email'] }, // ✅ ดึงข้อมูลคนสร้าง (Owner)
      team_members: { fields: ['username'] },     // ✅ ดึงทีมงาน
      jobs: {
        populate: {
          job_tasks: {
            fields: ['progress'] 
          }
        }
      }
    },
    sort: ['createdAt:desc']
  };
  
  // ใช้ apiClient แทน axios (ไม่ต้องใส่ full URL เพราะมี baseURL แล้ว)
  const response = await apiClient.get('/project-sites', {
    params: query,
    paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
  });

  return response.data.data.map(normalizeStrapiData);
};

export const fetchProjectJobs = async (projectDocId: string) => {
  try {
    const query = {
      populate: {
        creator: { fields: ['username', 'id'] }, // ✅ เช็คเจ้าของโปรเจกต์
        jobs: { 
          populate: {
             job_tasks: { populate: ['task_logs'] } 
          }
        },
        team_members: {
          fields: ['username', 'email']
        }
      },
      publicationState: 'preview',
      sort: ['createdAt:desc']
    };

    const response = await apiClient.get('/project-sites', {
      params: query,
      paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
    });

    const allProjects = response.data.data.map(normalizeStrapiData);
    const foundProject = allProjects.find((p: any) => p.documentId === projectDocId);
    
    return foundProject || null;
  } catch (error) {
    console.error("Error in fetchProjectJobs:", error);
    throw error;
  }
};

// ⚠️ แก้ไข createProject ให้รับ ownerId จาก Dropdown (ถ้ามี)
export const createProject = async (data: { name: string, location: string, distance: string, start: string, end: string, coordinates: string, ownerId?: number }) => {
  return await apiClient.post('/project-sites', {
    data: {
      name: data.name,
      location: data.location || null,      
      coordinates: data.coordinates || null, 
      distance_from_branch: data.distance || null,
      start_date: data.start ? data.start : null, 
      end_date: data.end ? data.end : null,
      creator: data.ownerId // ✅ ใช้ ownerId ที่ส่งมา (ถ้าไม่ส่ง Backend อาจจะไม่ผูก หรือผูก default)
    }
  });
};

// ⚠️ แก้ไข updateProject ให้สามารถเปลี่ยนคนดูแลได้ (Re-assign)
export const updateProject = async (projectDocId: string, data: { name: string, location: string, distance: string, start: string, end: string, coordinates: string, ownerId?: number }) => {
  return await apiClient.put(`/project-sites/${projectDocId}`, {
    data: {
      name: data.name,
      location: data.location || null,      
      coordinates: data.coordinates || null, 
      distance_from_branch: data.distance || null,
      start_date: data.start ? data.start : null, 
      end_date: data.end ? data.end : null,
      creator: data.ownerId // ✅ ยอมให้เปลี่ยนคนดูแลได้
    }
  });
};

export const deleteProject = async (projectDocId: string) => {
    return await apiClient.delete(`/project-sites/${projectDocId}`);
};


// ==========================================
// 📂 JOBS (Level 1)
// ==========================================

export const fetchJobDetailsById = async (jobId: string) => {
  if (!jobId || jobId === 'undefined') return null;
  const query = {
    populate: { 
      job_tasks: { 
        populate: { 
          task_logs: { populate: ['Media'], sort: ['createdAt:desc'] }
        } 
      } 
    }
  };
  const response = await apiClient.get(`/jobs/${jobId}`, {
    params: query,
    paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
  });
  return normalizeStrapiData(response.data.data);
};

export const createJob = async (title: string, projectDocId: string) => {
  return await apiClient.post('/jobs', {
    data: {
      title: title,
      project_site: projectDocId, 
      progress: 0
    }
  });
};

export const updateJob = async (jobDocId: string, data: { title?: string, progress?: number }) => {
  return await apiClient.put(`/jobs/${jobDocId}`, {
    data: {
      title: data.title,       
      progress: data.progress  
    }
  });
};

export const deleteJob = async (jobDocId: string) => {
  return await apiClient.delete(`/jobs/${jobDocId}`);
};


// ==========================================
// 📋 JOB TASKS (Level 2)
// ==========================================

export const fetchTaskWithLogs = async (taskDocumentId: string) => {
  try {
    const query = {
      populate: {
        task_logs: {
          populate: ['Media'], 
          sort: ['createdAt:desc'] 
        }
      }
    };
    
    const response = await apiClient.get(`/job-tasks/${taskDocumentId}`, {
        params: query,
        paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
    });
    
    return normalizeStrapiData(response.data.data);
  } catch (error) {
    console.error("Error fetching task logs:", error);
    throw error;
  }
};

export const createJobTask = async (taskName: string, jobDocId: string, quantity: number, unit: string) => {
  return await apiClient.post('/job-tasks', { 
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

export const updateJobTask = async (taskDocId: string, data: any) => {
  return await apiClient.put(`/job-tasks/${taskDocId}`, {
    data: {
      task_name: data.task_name,
      quantity: Number(data.quantity),
      unit: data.unit
    }
  });
};

export const deleteJobTask = async (taskDocId: string) => {
  return await apiClient.delete(`/job-tasks/${taskDocId}`);
};


// ==========================================
// 📝 TASK LOGS & PROGRESS SYNC (Level 3)
// ==========================================

// ✅ คำนวณค่าเฉลี่ย Progress จากลูกๆ (Logs) ขึ้นแม่ (JobTask)
const recalculateTaskProgress = async (jobTaskDocId: string) => {
  try {
    const query = {
      populate: {
        task_logs: {
          fields: ['progress_percentage'] 
        }
      }
    };
    const response = await apiClient.get(`/job-tasks/${jobTaskDocId}`, {
        params: query,
        paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
    });
    
    const taskData = normalizeStrapiData(response.data.data);
    const logs = taskData.task_logs || [];

    let newProgress = 0;
    if (logs.length > 0) {
      const total = logs.reduce((sum: number, log: any) => sum + (log.progress_percentage || 0), 0);
      newProgress = Math.round(total / logs.length);
    }

    await apiClient.put(`/job-tasks/${jobTaskDocId}`, {
      data: { progress: newProgress }
    });

    console.log(`🔄 Recalculated Task Progress: ${newProgress}% (from ${logs.length} logs)`);
    return newProgress;

  } catch (error) {
    console.error("⚠️ Failed to recalculate task progress", error);
  }
};

export const createTaskLog = async (jobTaskDocId: string, data: any) => {
  try {
    let mediaIds: any[] = [];
    if (data.photos && data.photos.length > 0) {
      const uploadPromises = data.photos.map(async (file: File) => {
        const formData = new FormData();
        formData.append('files', file); 
        const uploadRes = await apiClient.post('/upload', formData); // ใช้ apiClient แทน axios
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

    const response = await apiClient.post('/task-logs', payload);

    // Sync กลับแม่
    await recalculateTaskProgress(jobTaskDocId);

    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const updateTaskLog = async (logDocumentId: string, data: any, existingMediaIds: number[], jobTaskDocId: string) => {
  try {
    let newMediaIds: any[] = [];
    if (data.photos && data.photos.length > 0) {
       const uploadPromises = data.photos.map(async (file: File) => {
        const formData = new FormData();
        formData.append('files', file); 
        const uploadRes = await apiClient.post('/upload', formData);
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

    const response = await apiClient.put(`/task-logs/${logDocumentId}`, payload);

    if (jobTaskDocId) {
      await recalculateTaskProgress(jobTaskDocId);
    }

    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const deleteTaskLog = async (logDocumentId: string, jobTaskDocId: string) => {
  await apiClient.delete(`/task-logs/${logDocumentId}`);
  if (jobTaskDocId) {
      await recalculateTaskProgress(jobTaskDocId);
  }
};