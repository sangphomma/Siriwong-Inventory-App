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

// services/api.ts

// ... (ส่วน import ด้านบน)

const normalizeStrapiData = (data: any): any => {
  if (!data || data._isNormalized) return data;
  const normalized: any = {
    id: data.id,
    documentId: data.documentId,
    ...data.attributes,
    ...data,
    _isNormalized: true
  };
  
  // ✅ แก้ไขบรรทัดนี้: เพิ่ม 'user' เข้าไปในรายการ
  const relations = [
      'jobs', 
      'job_tasks', 
      'task_logs', 
      'Media', 
      'creator', 
      'team_members', 
      'user' // 👈 เพิ่มตัวนี้ครับ!
  ];
  
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

// ... (ส่วนอื่นเหมือนเดิม)

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
          fields: ['progress_percentage', 'Log_Type'] // 👈 ดึง Log_Type มาด้วย
        }
      }
    };
    const response = await apiClient.get(`/job-tasks/${jobTaskDocId}`, {
        params: query,
        paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
    });
    
    const taskData = normalizeStrapiData(response.data.data);
    const logs = taskData.task_logs || [];

    // 🎯 LOGIC ใหม่: กรองเฉพาะ Type 'Progress'
    const progressLogs = logs.filter((l: any) => l.Log_Type === 'Progress');

    let newProgress = 0;
    
    if (progressLogs.length > 0) {
      // ✅ (Option A) เปิดใช้ส่วนนี้: ใช้ค่าล่าสุด (Latest Value)
      // เรียงลำดับเวลาจาก "ใหม่ -> เก่า"
      progressLogs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      // หยิบตัวแรก (ตัวใหม่สุด) มาใช้เลย
      newProgress = progressLogs[0].progress_percentage;

      // ❌ (Option B) ปิดส่วนนี้ไป: ไม่ใช้ค่าเฉลี่ยแล้ว
      // const total = progressLogs.reduce((sum: number, log: any) => sum + (log.progress_percentage || 0), 0);
      // newProgress = Math.round(total / progressLogs.length);
} else {
    newProgress = taskData.progress || 0; 
}

    await apiClient.put(`/job-tasks/${jobTaskDocId}`, {
      data: { progress: newProgress }
    });

    return newProgress;

  } catch (error) {
    console.error("⚠️ Failed to recalculate task progress", error);
  }
};

export const createTaskLog = async (jobTaskDocId: string, data: any) => {
  try {
    // ... (ส่วน upload รูปเหมือนเดิม) ...
    let mediaIds: any[] = [];
    if (data.photos && data.photos.length > 0) {
      // ... (Code Upload รูปเดิม) ...
       const uploadPromises = data.photos.map(async (file: File) => {
        const formData = new FormData();
        formData.append('files', file); 
        const uploadRes = await apiClient.post('/upload', formData);
        return uploadRes.data[0];
      });
      const uploadedFiles = await Promise.all(uploadPromises);
      mediaIds = uploadedFiles.map((f: any) => f.id);
    }

    const payload = {
      data: {
        Description: String(data.description || ""), 
        Log_Type: data.logType || "Info", // 👈 รับค่า Type จาก Frontend
        job_task: jobTaskDocId,
        Media: mediaIds,
        // ถ้าไม่ใช่ Progress ให้ส่ง 0 หรือ null ไป (เพื่อไม่ให้กวน Data)
        progress_percentage: data.logType === 'Progress' ? Number(data.progress || 0) : 0, 
        problems_found: data.problems || "" 
      }
    };

    const response = await apiClient.post('/task-logs', payload);
    
    // Sync เฉพาะถ้าเป็น Progress (หรือจะ Sync ทุกครั้งเพื่อให้ชัวร์ก็ได้ครับ ผมแนะนำ Sync ทุกครั้งเผื่ออนาคต)
    await recalculateTaskProgress(jobTaskDocId); 

    return response.data;
  } catch (error: any) {
    throw error;
  }
};


// ... (updateTaskLog ก็ทำคล้ายกัน เพิ่ม field Log_Type เข้าไปใน payload) ...
export const updateTaskLog = async (logDocumentId: string, data: any, existingMediaIds: number[], jobTaskDocId: string) => {
    // ... (Code Upload รูปเดิม) ...
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
        Log_Type: data.logType, // 👈 Update Type
        Media: finalMediaIds, 
        progress_percentage: data.logType === 'Progress' ? Number(data.progress || 0) : 0, 
        problems_found: data.problems || "" 
      }
    };

    const response = await apiClient.put(`/task-logs/${logDocumentId}`, payload);

    if (jobTaskDocId) {
      await recalculateTaskProgress(jobTaskDocId);
    }

    return response.data;
};

export const deleteTaskLog = async (logDocumentId: string, jobTaskDocId: string) => {
  await apiClient.delete(`/task-logs/${logDocumentId}`);
  if (jobTaskDocId) {
      await recalculateTaskProgress(jobTaskDocId);
  }
};

// ... (โค้ดเดิม)

// ==========================================
// 👤 USER MANAGEMENT (Admin Only)
// ==========================================
// services/api.ts

// ... (โค้ดอื่นๆ)

// ✅ เพิ่มฟังก์ชันสำหรับดึง Default Role (Authenticated)
export const getDefaultRole = async () => {
  try {
    const response = await apiClient.get('/users-permissions/roles');
    const roles = response.data.roles;
    
    // หา Role ที่ชื่อ 'Authenticated' (เป็น Default ของ User ทั่วไป)
    // หรือจะหาจาก type: 'authenticated' ก็ได้ (แม่นยำกว่า)
    const authRole = roles.find((r: any) => r.type === 'authenticated');
    
    return authRole ? authRole.id : null;
  } catch (error) {
    console.error("Error fetching roles:", error);
    return null;
  }
};
// สร้าง User ใหม่ (ปกติ Strapi ใช้ /auth/local/register แต่ถ้า Admin สร้างให้ใช้ /users ได้ถ้าเปิดสิทธิ์)
export const createUser = async (userData: any) => {
  return await apiClient.post('/users', userData);
};

// แก้ไขข้อมูล User
export const updateUser = async (userId: string | number, userData: any) => {
  return await apiClient.put(`/users/${userId}`, userData);
};

// ลบ User
export const deleteUser = async (userId: string | number) => {
  return await apiClient.delete(`/users/${userId}`);
};

// ดึง Role ทั้งหมด (เพื่อเอามาใส่ Dropdown ตอนสร้าง User ว่าจะเป็น Admin หรือ User ธรรมดา)
export const getRoles = async () => {
    const response = await apiClient.get('/users-permissions/roles');
    return response.data.roles; 
};

// services/api.ts (ส่วนต่อท้าย)

// ==========================================
// 👷 PROJECT MEMBERS (ทีมงานในโปรเจกต์)
// ==========================================

// ดึงรายชื่อทีมงานทั้งหมดในโปรเจกต์นี้
// services/api.ts

export const getProjectMembers = async (projectDocId: string) => {
  const query = {
    filters: {
      project_site: {
        documentId: {
          $eq: projectDocId
        }
      }
    },
    populate: {
      user: {
        fields: ['username', 'email', 'position'], // ✅ ดึงเฉพาะข้อความ
        populate: {
            avatar: true // ✅ ดึงรูป avatar แยกออกมา
        }
      }
    },
    sort: ['start_date:desc']
  };

  const response = await apiClient.get('/project-members', {
    params: query,
    paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
  });

  // ✅ แก้ไขตรงนี้: บังคับแกะข้อมูล User เอง
  const members = response.data.data.map(normalizeStrapiData);
  return members.map((m: any) => {
      // เช็คว่า user ยังติดอยู่ในกล่อง data หรือไม่? ถ้าใช่ ให้แกะออก
      if (m.user && m.user.data) {
          m.user = normalizeStrapiData(m.user.data);
      }
      return m;
  });
};

// เพิ่มทีมงานเข้าโปรเจกต์
export const addProjectMember = async (data: any) => {
  // data ต้องมี: projectSiteId, userId, role, responsibility, start_date, end_date
  return await apiClient.post('/project-members', {
    data: {
      project_site: data.projectSiteId, // ✅ ผูกกับ Project (Relation)
      user: data.userId,                // ✅ ผูกกับ User (Relation)
      role_in_project: data.role,
      responsibility: data.responsibility,
      start_date: data.start_date,
      end_date: data.end_date || null
    }
  });
};

// ลบทีมงานออกจากโปรเจกต์ (ลบประวัติ)
export const deleteProjectMember = async (documentId: string) => {
  return await apiClient.delete(`/project-members/${documentId}`);
};

// แก้ไขข้อมูลสมาชิกในทีม (Role, Date, Responsibility)
export const updateProjectMember = async (documentId: string, data: any) => {
  return await apiClient.put(`/project-members/${documentId}`, {
    data: {
      // เรามักจะไม่แก้ User หรือ Project Site (เพราะเป็น Relation หลัก) แก้แค่รายละเอียดงาน
      role_in_project: data.role,
      responsibility: data.responsibility,
      start_date: data.start_date,
      end_date: data.end_date || null
    }
  });
};

// services/api.ts (เพิ่มต่อท้ายไฟล์)

// ... (โค้ดเดิม)

// ✅ ฟังก์ชันใหม่: ดึง Log ของทั้งโปรเจกต์ แบบแบ่งหน้า (Infinite Scroll)
export const fetchProjectLogs = async (projectDocId: string, page: number = 1, pageSize: number = 10) => {
  try {
    const query = {
      filters: {
        job_task: {
          job: {
            project_site: {
              documentId: { $eq: projectDocId }
            }
          }
        }
      },
      populate: {
        Media: true,
        job_task: {
          fields: ['task_name'],
          populate: {
            job: {
              fields: ['title', 'documentId']
            }
          }
        }
      },
      sort: ['createdAt:desc'], // ใหม่สุดขึ้นก่อน
      pagination: {
        page: page,
        pageSize: pageSize
      }
    };

    const response = await apiClient.get('/task-logs', {
      params: query,
      paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
    });

    const logs = response.data.data.map(normalizeStrapiData);
    
    // แปลงโครงสร้างให้แบนราบ เพื่อง่ายต่อการแสดงผลหน้าเว็บ
    const flattenedLogs = logs.map((log: any) => ({
      ...log,
      taskName: log.job_task?.task_name || "Unknown Task",
      jobTitle: log.job_task?.job?.title || "Unknown Job",
      jobId: log.job_task?.job?.documentId,
      taskId: log.job_task?.documentId
    }));

    return {
      data: flattenedLogs,
      meta: response.data.meta
    };
  } catch (error) {
    console.error("Error fetching project logs:", error);
    return { data: [], meta: null };
  }
};