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

// ✅ Safe Version: ดึง User แบบไม่พังแน่นอน
export const getAllUsers = async () => {
  try {
    const response = await apiClient.get('/users');
    
    // 🔍 Log ดูว่าได้อะไรกลับมา (กด F12 ดู console)
    console.log("🔥 Raw Users API:", response.data);

    // กรณีปกติ Strapi จะส่งมาเป็น Array เลย [ {id:1...}, {id:2...} ]
    if (Array.isArray(response.data)) {
        return response.data;
    }
    
    // กรณี Strapi บางเวอร์ชันส่งมาเป็น Object { data: [...] }
    if (response.data && Array.isArray(response.data.data)) {
        return response.data.data; // แกะออกมา
    }

    return []; // ถ้าไม่ใช่ทั้งคู่ ให้ส่ง array ว่างไปก่อน (กันแอปพัง)

  } catch (error) {
    console.error("❌ Get Users Failed:", error);
    return []; // ส่ง array ว่างเมื่อ error
  }
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
// services/api.ts

// ... (ส่วนอื่นๆ ของไฟล์)

const recalculateTaskProgress = async (jobTaskDocId: string) => {
  try {
    const query = {
      populate: {
        task_logs: {
          fields: ['progress_percentage', 'Log_Type', 'action_date', 'createdAt'] 
        }
      }
    };
    const response = await apiClient.get(`/job-tasks/${jobTaskDocId}`, {
        params: query,
        paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
    });
    
    const taskData = normalizeStrapiData(response.data.data);
    const logs = taskData.task_logs || [];

    // 🎯 LOGIC: กรองเฉพาะ Type 'Progress'
    const progressLogs = logs.filter((l: any) => l.Log_Type === 'Progress');

    let newProgress = 0;
    
    if (progressLogs.length > 0) {
      // ✅ เรียงลำดับโดยใช้ action_date (วันที่ทำงานจริง) เป็นหลัก ถ้าไม่มีให้ใช้ createdAt
      progressLogs.sort((a: any, b: any) => {
        const dateA = new Date(a.action_date || a.createdAt).getTime();
        const dateB = new Date(b.action_date || b.createdAt).getTime();
        return dateB - dateA; // ใหม่สุดอยู่บน (Index 0)
      });

      // หยิบตัวแรกที่ใหม่ที่สุดมาเป็น Progress ปัจจุบัน
      newProgress = progressLogs[0].progress_percentage;
    } else {
      newProgress = 0; // ถ้าไม่มี Log Progress เลย ให้เซ็ตเป็น 0
    }

    await apiClient.put(`/job-tasks/${jobTaskDocId}`, {
      data: { progress: newProgress }
    });

    return newProgress;

  } catch (error) {
    console.error("⚠️ Failed to recalculate task progress", error);
  }
};

// ... (ส่วนที่เหลือคงเดิม)

// ✅ แก้ไข: createTaskLog ให้รับ action_date
export const createTaskLog = async (jobTaskDocId: string, data: any) => {
  try {
    let mediaIds: any[] = [];
    if (data.photos && data.photos.length > 0) {
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
        Log_Type: data.logType || "Info", 
        job_task: jobTaskDocId,
        Media: mediaIds,
        progress_percentage: data.logType === 'Progress' ? Number(data.progress || 0) : 0, 
        problems_found: data.problems || "",
        // ✅ เพิ่ม: บันทึกวันที่ย้อนหลัง (ถ้ามี) หรือใช้วันปัจจุบัน
        action_date: data.action_date ? new Date(data.action_date).toISOString() : new Date().toISOString(),
        // หมายเหตุ: ต้องไปสร้าง field 'action_date' (Date/Time) ใน Strapi ด้วยนะครับ
        // หรือถ้าจะโกงใช้ createdAt ต้องไปแก้สิทธิ์ให้ create ส่ง createdAt ได้ (ไม่แนะนำ)
      }
    };

    const response = await apiClient.post('/task-logs', payload);
    await recalculateTaskProgress(jobTaskDocId); 
    return response.data;
  } catch (error: any) {
    throw error;
  }
};


// ... (updateTaskLog ก็ทำคล้ายกัน เพิ่ม field Log_Type เข้าไปใน payload) ...
// ✅ แก้ไข: updateTaskLog ให้รับ action_date
export const updateTaskLog = async (logDocumentId: string, data: any, existingMediaIds: number[], jobTaskDocId: string) => {
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
        Log_Type: data.logType, 
        Media: finalMediaIds, 
        progress_percentage: data.logType === 'Progress' ? Number(data.progress || 0) : 0, 
        problems_found: data.problems || "",
        // ✅ อัปเดตวันที่ด้วย
        action_date: data.action_date ? new Date(data.action_date).toISOString() : undefined
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

// --- 📂 GALLERY SERVICES ---

export const getProjectGalleries = async (projectDocId: string) => {
  const query = {
    filters: { project: { documentId: { $eq: projectDocId } } }, // อิงตามชื่อ field 'project' ในรูป 2
    populate: ['photos'], // ดึงรูปภาพมาด้วย
    sort: ['createdAt:desc']
  };
  const response = await apiClient.get('/project-galleries', {
    params: query,
    paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
  });
  return response.data.data.map(normalizeStrapiData);
};

export const createProjectGallery = async (data: any) => {
    // ต้องห่อด้วย { data: ... } ตามฟอร์ม Strapi
    return await apiClient.post('/project-galleries', { data });
};

// --- 📦 MATERIAL & STOCK SERVICES ---

export const getMaterialLogs = async (projectDocId: string) => {
    const query = {
      filters: { project_site: { documentId: { $eq: projectDocId } } }, // อิงตามชื่อ field 'project_site' ในรูป 3
      populate: {
          product: { populate: ['image'] } // ดึงข้อมูลสินค้าและรูปสินค้า
      }, 
      sort: ['log_date:desc']
    };
    const response = await apiClient.get('/project-material-logs', {
      params: query,
      paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
    });
    
    // Normalize ข้อมูลสินค้าให้ใช้ง่ายๆ
    const logs = response.data.data.map(normalizeStrapiData);
    return logs.map((log: any) => {
        if (log.product?.data) log.product = normalizeStrapiData(log.product.data);
        return log;
    });
};



// ดึงรายชื่อสินค้าทั้งหมด (เอาไว้ทำ Dropdown ให้เลือกตอนเบิก)
export const getAllProducts = async () => {
    const response = await apiClient.get('/products?populate=*');
    return response.data.data.map(normalizeStrapiData);
};

// services/api.ts

// ... (ต่อจากโค้ดเดิม)

// 📤 ฟังก์ชันสำหรับอัปโหลดไฟล์ (ใช้ FormData)
export const uploadFiles = async (refId: string, ref: string, field: string, files: FileList | File[]) => {
    const formData = new FormData();
    
    // ใส่ไฟล์เข้าไปใน FormData
    Array.from(files).forEach((file) => {
        formData.append('files', file);
    });

    // ระบุว่ารูปนี้เป็นของใคร (Ref)
    formData.append('ref', ref); // ชื่อ Collection (เช่น 'api::project-gallery.project-gallery')
    formData.append('refId', refId); // ID ของ Entry
    formData.append('field', field); // ชื่อ Field (เช่น 'photos')

    return await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

// ✅ สูตรใหม่: อัปโหลดรูปก่อน แล้วส่ง ID กลับไป
export const uploadFilesOnly = async (files: FileList | File[]) => {
    const formData = new FormData();
    
    Array.from(files).forEach((file) => {
        formData.append('files', file);
    });

    // ยิงไปที่ /upload ตรงๆ ไม่ต้องระบุ refId
    const response = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    return response.data; // จะได้ Array ของไฟล์กลับมา (ในนั้นมี id)
};

// services/api.ts

// ... (ต่อท้ายไฟล์)

// 🗑️ ลบอัลบั้ม
export const deleteProjectGallery = async (docId: string) => {
    return await apiClient.delete(`/project-galleries/${docId}`);
};

// 🔄 อัปเดตอัลบั้ม (ใช้สำหรับลบรูปบางรูปออกจากอัลบั้ม)
export const updateProjectGallery = async (docId: string, data: any) => {
    return await apiClient.put(`/project-galleries/${docId}`, { data });
};

// services/api.ts

// ...

// 📥 แก้ไขรอบที่ 3: ดึงข้อมูลแบบครอบจักรวาล (populate: '*') และแกะกล่องข้อมูลให้ชัวร์
// services/api.ts

// ... (Search หา getGalleryPhotos ตัวเก่า ลบออก แล้วแทนด้วยตัวนี้ครับ)

// 📥 ไม้ตาย: ดึงรูปภาพแบบแกะกล่องเอง (Manual Extraction)
export const getGalleryPhotos = async (galleryId: string) => {
  try {
    // 1. ยิง API แบบระบุ populate=* ตรงๆ เพื่อความชัวร์
    const response = await apiClient.get(`/project-galleries/${galleryId}?populate=*`);
    
    // 🔍 Log ดูข้อมูลดิบๆ จาก Strapi (กด F12 ดูใน Console ได้เลย)
    console.log("🔥 RAW API Response:", response.data);

    // 2. เริ่มแกะข้อมูล (รองรับทั้ง Strapi v4 และ v5)
    const rootData = response.data.data || response.data; // บางที data อยู่ชั้นนอก บางทีอยู่ชั้นใน
    const attributes = rootData.attributes || rootData;   // บางที attributes ซ้อนอยู่
    
    // 3. หา Array ของรูปภาพ
    let rawPhotos: any[] = [];
    
    if (attributes.photos) {
        if (Array.isArray(attributes.photos)) {
             // กรณีเป็น Array เลย (Strapi v5 หรือบาง Setup)
             rawPhotos = attributes.photos;
        } else if (attributes.photos.data && Array.isArray(attributes.photos.data)) {
             // กรณีซ้อนอยู่ใน .data (Strapi v4)
             rawPhotos = attributes.photos.data;
        }
    }

    console.log("📸 Raw Photos Found:", rawPhotos.length);

    // 4. แปลงข้อมูลให้หน้าจอเอาไปใช้ง่ายๆ
    const cleanPhotos = rawPhotos.map((item: any) => {
        const attrs = item.attributes || item; // รองรับ v4/v5
        return {
            id: item.id,
            documentId: item.documentId || item.id, // กันเหนียว
            url: attrs.url,
            createdAt: attrs.createdAt
            // ...เพิ่ม field อื่นถ้าต้องการ
        };
    });

    return { photos: cleanPhotos }; // ส่งกลับในรูปแบบที่ ProjectGallery.tsx รอรับอยู่

  } catch (error) {
    console.error("❌ Error in getGalleryPhotos:", error);
    return { photos: [] }; // ถ้าพัง ให้ส่งอาเรย์ว่างไป หน้าจอจะได้ไม่ขาว
  }
};

// ✅ ADD NEW: ฟังก์ชันสำหรับเพิ่มรูปเข้าอัลบั้มเดิม (Connect)
export const addPhotosToGallery = async (galleryDocId: string, newPhotoIds: string[]) => {
    return await apiClient.put(`/project-galleries/${galleryDocId}`, {
        data: {
            photos: {
                connect: newPhotoIds // สั่ง Strapi ว่าให้เชื่อมรูปเหล่านี้เพิ่มเข้าไป
            }
        }
    });
};

// ✂️ ลบรูปออกจากอัลบั้ม (ใช้เทคนิค disconnect)
export const removePhotoFromGallery = async (galleryId: string, photoId: string) => {
    return await apiClient.put(`/project-galleries/${galleryId}`, {
        data: {
            photos: {
                disconnect: [photoId] // สั่งตัดความสัมพันธ์เฉพาะรูปนี้
            }
        }
    });
};

// services/api.ts

// ... (ต่อท้ายไฟล์)

// 📦 MATERIAL: ดึงรายการสินค้าทั้งหมด (สำหรับ Dropdown)
export const getAllProductsSafe = async () => {
    try {
        const response = await apiClient.get('/products?populate=*&sort=name:asc');
        const rootData = response.data.data || response.data;
        
        // แกะกล่องสินค้า
        let items: any[] = [];
        if (Array.isArray(rootData)) items = rootData;
        else if (rootData.data && Array.isArray(rootData.data)) items = rootData.data;

        return items.map((item: any) => {
            const attrs = item.attributes || item;
            // แกะรูปภาพสินค้า (ถ้ามี)
            let imgUrl = null;
            if (attrs.image) {
                const imgData = attrs.image.data || attrs.image;
                if (Array.isArray(imgData) && imgData.length > 0) imgUrl = imgData[0].attributes?.url || imgData[0].url;
                else if (imgData && !Array.isArray(imgData)) imgUrl = imgData.attributes?.url || imgData.url;
            }

            return {
                id: item.id,
                documentId: item.documentId || item.id,
                name: attrs.name,
                unit: attrs.unit || 'ชิ้น',
                image: imgUrl
            };
        });
    } catch (error) {
        console.error("Get Products Failed:", error);
        return [];
    }
};

// 📝 MATERIAL: ดึงประวัติการเบิกจ่ายของไซต์นี้ (แก้ไขชื่อ Field)
export const getMaterialLogsSafe = async (projectDocId: string) => {
    try {
        const query = {
            filters: { project_site: { documentId: { $eq: projectDocId } } }, // ✅ แก้ให้ตรงกับ Strapi
            populate: {
                product: { populate: '*' }
            },
            sort: ['log_date:desc']
        };
        
        const response = await apiClient.get('/project-material-logs', {
            params: query,
            paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
        });

        const rootData = response.data.data || response.data;
        let logs: any[] = [];
        if (Array.isArray(rootData)) logs = rootData;
        else if (rootData.data && Array.isArray(rootData.data)) logs = rootData.data;

        return logs.map((log: any) => {
            const attrs = log.attributes || log;
            
            let productData = null;
            if (attrs.product) {
                const pRaw = attrs.product.data || attrs.product;
                const pAttrs = pRaw.attributes || pRaw;
                
                let pImg = null;
                if (pAttrs.image) {
                     const iRaw = pAttrs.image.data || pAttrs.image;
                     if(Array.isArray(iRaw) && iRaw.length>0) pImg = iRaw[0].attributes?.url || iRaw[0].url;
                     else if(iRaw && !Array.isArray(iRaw)) pImg = iRaw.attributes?.url || iRaw.url;
                }

                productData = {
                    name: pAttrs.name || "สินค้าไม่ระบุชื่อ",
                    unit: pAttrs.unit || "-",
                    image: pImg
                };
            }

            return {
                id: log.id,
                documentId: log.documentId || log.id,
                quantity: attrs.quantity,
                requester: attrs.requester_name, 
                date: attrs.log_date,
                note: attrs.note,
                product: productData
            };
        });

    } catch (error) {
        console.error("Get Material Logs Failed:", error);
        return [];
    }
};

// ➕ MATERIAL: สร้างรายการเบิก
export const createMaterialLog = async (data: any) => {
    // data ต้องประกอบด้วย: { project: docId, product: docId, quantity: number, requester_name: string, log_date: date, note: string }
    return await apiClient.post('/project-material-logs', { data });
};

// ➕ MATERIAL: เพิ่มฟังก์ชันแก้ไขรายการเบิก
export const updateMaterialLog = async (logId: string, quantity: number) => {
    return await apiClient.put(`/project-material-logs/${logId}`, {
        data: { quantity }
    });
};

// ➕ MATERIAL: เพิ่มฟังก์ชันลบรายการเบิก
export const deleteMaterialLog = async (logId: string) => {
    return await apiClient.delete(`/project-material-logs/${logId}`);
};


// services/api.ts

// 🎁 MATERIAL: ดึงข้อมูล Presets (แบบแกะกล่องชัวร์ 100%)
export const getMaterialPresets = async () => {
  try {
    const query = {
      populate: {
        items: {
          populate: {
             product: { populate: '*' } // ดึง Product และรูปภาพ
          }
        }
      },
      sort: ['createdAt:asc']
    };

    const response = await apiClient.get('/material-presets', {
      params: query,
      paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
    });

    // ✅ MANUAL UNWRAP: แกะข้อมูลเองทีละชั้น รองรับทั้ง Strapi v4 และ v5
    const rawData = response.data.data || [];
    
    return rawData.map((item: any) => {
        const attrs = item.attributes || item; // ถ้ามี attributes ก็ใช้ ถ้าไม่มีก็ใช้ตัวมันเอง
        
        // แกะ Items (สินค้าข้างใน)
        let cleanItems: any[] = [];
        if (attrs.items) {
            cleanItems = attrs.items.map((subItem: any) => {
                const subAttrs = subItem; 
                
                // แกะ Product (ที่ซ้อนอยู่ใน Relation)
                let prod = subAttrs.product;
                if (prod && prod.data) {
                    const prodAttrs = prod.data.attributes || prod.data;
                    prod = { 
                        id: prod.data.id, 
                        documentId: prod.data.documentId,
                        name: prodAttrs.name,
                        unit: prodAttrs.unit,
                        // ...ค่าอื่นๆ
                    };
                }
                
                return {
                    quantity: subAttrs.quantity,
                    product: prod
                };
            });
        }

        return {
            id: item.id,
            documentId: item.documentId,
            title: attrs.title || "No Title", // ถ้าไม่มีชื่อ ให้ขึ้น No Title
            icon: attrs.icon || "📦",         // ถ้าไม่มีไอคอน ให้ขึ้นกล่อง
            items: cleanItems
        };
    });

  } catch (error) {
    console.error("Get Presets Failed:", error);
    return [];
  }
};