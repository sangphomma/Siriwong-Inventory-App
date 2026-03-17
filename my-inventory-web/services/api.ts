/* eslint-disable @typescript-eslint/no-explicit-any */

// services/api.ts

import axios from 'axios';
import qs from 'qs';
import { getToken } from './auth'; 
import { STRAPI_URL } from './config'; 

// ==========================================
// 🌍 CONFIG & INSTANCE
// ==========================================

const API_URL = `${STRAPI_URL}/api`;

const apiClient = axios.create({
  baseURL: API_URL,
});

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
  
  const relations = [
      'jobs', 'job_tasks', 'task_logs', 'Media', 'creator', 'team_members', 'user', 
      'project_site', 'product', 'photos', 'items'
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

const formatTimeForStrapi = (timeStr: string) => {
  if (!timeStr) return null;
  if (timeStr.length === 5) return `${timeStr}:00.000`;
  if (timeStr.length === 8) return `${timeStr}.000`;
  return timeStr;
};

export const uploadFilesOnly = async (files: FileList | File[]) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
        formData.append('files', file);
    });
    const response = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data; 
};

export const uploadFiles = async (refId: string, ref: string, field: string, files: FileList | File[]) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
        formData.append('files', file);
    });
    formData.append('ref', ref); 
    formData.append('refId', refId); 
    formData.append('field', field); 

    return await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

// ==========================================
// 🏗️ PROJECT SITES (Level 0)
// ==========================================

export const getAllProjects = async () => {
  const query = {
    populate: {
      creator: { fields: ['username', 'email'] }, 
      team_members: { fields: ['username'] },     
      jobs: { populate: { job_tasks: { fields: ['progress'] } } }
    },
    sort: ['createdAt:desc']
  };
  
  const response = await apiClient.get('/project-sites', {
    params: query, paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
  });
  return response.data.data.map(normalizeStrapiData);
};

export const fetchProjectJobs = async (projectDocId: string) => {
  try {
    const query = {
      populate: {
        creator: { fields: ['username', 'id'] }, 
        jobs: { populate: { job_tasks: { populate: ['task_logs'] } } },
        team_members: { fields: ['username', 'email'] }
      },
      publicationState: 'preview', sort: ['createdAt:desc']
    };
    const response = await apiClient.get('/project-sites', {
      params: query, paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
    });
    const allProjects = response.data.data.map(normalizeStrapiData);
    return allProjects.find((p: any) => p.documentId === projectDocId) || null;
  } catch (error) { throw error; }
};

export const createProject = async (data: any) => {
  return await apiClient.post('/project-sites', {
    data: {
      name: data.name, location: data.location || null, coordinates: data.coordinates || null, 
      distance_from_branch: data.distance || null, start_date: data.start ? data.start : null, 
      end_date: data.end ? data.end : null, creator: data.ownerId, project_status: data.project_status || 'active'
    }
  });
};

export const updateProject = async (projectDocId: string, data: any) => {
  return await apiClient.put(`/project-sites/${projectDocId}`, {
    data: {
      name: data.name, location: data.location || null, coordinates: data.coordinates || null, 
      distance_from_branch: data.distance || null, start_date: data.start ? data.start : null, 
      end_date: data.end ? data.end : null, creator: data.ownerId, project_status: data.project_status
    }
  });
};

export const deleteProject = async (projectDocId: string) => await apiClient.delete(`/project-sites/${projectDocId}`);
export const getProjectById = async (documentId: string) => {
  const query = { filters: { documentId: { $eq: documentId } }, populate: { customer: true, creator: { fields: ['username'] } } };
  const response = await apiClient.get(`/project-sites`, { params: query, paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }) });
  const data = response.data.data;
  if (Array.isArray(data) && data.length > 0) return normalizeStrapiData(data[0]); 
  return null;
};

// ==========================================
// 📂 JOBS (Level 1)
// ==========================================
export const fetchJobDetailsById = async (jobId: string) => {
  if (!jobId || jobId === 'undefined') return null;
  const query = { populate: { job_tasks: { populate: { task_logs: { populate: ['Media'], sort: ['createdAt:desc'] } } } } };
  const response = await apiClient.get(`/jobs/${jobId}`, { params: query, paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }) });
  return normalizeStrapiData(response.data.data);
};
export const createJob = async (title: string, projectDocId: string) => await apiClient.post('/jobs', { data: { title: title, project_site: projectDocId, progress: 0 } });
export const updateJob = async (jobDocId: string, data: any) => await apiClient.put(`/jobs/${jobDocId}`, { data: { title: data.title, progress: data.progress } });
export const deleteJob = async (jobDocId: string) => await apiClient.delete(`/jobs/${jobDocId}`);

// ==========================================
// 📋 JOB TASKS (Level 2)
// ==========================================
export const fetchTaskWithLogs = async (taskDocumentId: string) => {
  try {
    const query = { populate: { task_logs: { populate: ['Media'], sort: ['createdAt:desc'] } } };
    const response = await apiClient.get(`/job-tasks/${taskDocumentId}`, { params: query, paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }) });
    return normalizeStrapiData(response.data.data);
  } catch (error) { throw error; }
};
export const createJobTask = async (taskName: string, jobDocId: string, quantity: number, unit: string) => await apiClient.post('/job-tasks', { data: { task_name: taskName, job: jobDocId, quantity: Number(quantity), unit: unit, progress: 0, job_status: 'Pending' } });
export const updateJobTask = async (taskDocId: string, data: any) => await apiClient.put(`/job-tasks/${taskDocId}`, { data: { task_name: data.task_name, quantity: Number(data.quantity), unit: data.unit } });
export const deleteJobTask = async (taskDocId: string) => await apiClient.delete(`/job-tasks/${taskDocId}`);

// ==========================================
// 📝 TASK LOGS & PROGRESS SYNC (Level 3)
// ==========================================
const recalculateTaskProgress = async (jobTaskDocId: string) => {
  try {
    const query = { populate: { task_logs: { fields: ['progress_percentage', 'Log_Type', 'action_date', 'createdAt'] } } };
    const response = await apiClient.get(`/job-tasks/${jobTaskDocId}`, { params: query, paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }) });
    const taskData = normalizeStrapiData(response.data.data);
    const logs = taskData.task_logs || [];
    const progressLogs = logs.filter((l: any) => l.Log_Type === 'Progress');

    let newProgress = 0;
    if (progressLogs.length > 0) {
      progressLogs.sort((a: any, b: any) => new Date(b.action_date || b.createdAt).getTime() - new Date(a.action_date || a.createdAt).getTime());
      newProgress = progressLogs[0].progress_percentage;
    }
    await apiClient.put(`/job-tasks/${jobTaskDocId}`, { data: { progress: newProgress } });
    return newProgress;
  } catch (error) { console.error("⚠️ Failed to recalculate task progress", error); }
};
export const createTaskLog = async (jobTaskDocId: string, data: any) => {
  let mediaIds: any[] = [];
  if (data.photos && data.photos.length > 0) { const uploadedFiles = await uploadFilesOnly(data.photos); mediaIds = uploadedFiles.map((f: any) => f.id); }
  const payload = { data: { Description: String(data.description || ""), Log_Type: data.logType || "Info", job_task: jobTaskDocId, Media: mediaIds, progress_percentage: data.logType === 'Progress' ? Number(data.progress || 0) : 0, problems_found: data.problems || "", action_date: data.action_date ? new Date(data.action_date).toISOString() : new Date().toISOString() } };
  const response = await apiClient.post('/task-logs', payload);
  await recalculateTaskProgress(jobTaskDocId); return response.data;
};
export const updateTaskLog = async (logDocumentId: string, data: any, existingMediaIds: number[], jobTaskDocId: string) => {
    let newMediaIds: any[] = [];
    if (data.photos && data.photos.length > 0) { const uploadedFiles = await uploadFilesOnly(data.photos); newMediaIds = uploadedFiles.map((f: any) => f.id); }
    const payload = { data: { Description: String(data.description || ""), Log_Type: data.logType, Media: [...existingMediaIds, ...newMediaIds], progress_percentage: data.logType === 'Progress' ? Number(data.progress || 0) : 0, problems_found: data.problems || "", action_date: data.action_date ? new Date(data.action_date).toISOString() : undefined } };
    const response = await apiClient.put(`/task-logs/${logDocumentId}`, payload);
    if (jobTaskDocId) await recalculateTaskProgress(jobTaskDocId); return response.data;
};
export const deleteTaskLog = async (logDocumentId: string, jobTaskDocId: string) => {
  await apiClient.delete(`/task-logs/${logDocumentId}`);
  if (jobTaskDocId) await recalculateTaskProgress(jobTaskDocId);
};
export const fetchProjectLogs = async (projectDocId: string, page: number = 1, pageSize: number = 10) => {
  try {
    const query = { filters: { job_task: { job: { project_site: { documentId: { $eq: projectDocId } } } } }, populate: { Media: true, job_task: { fields: ['task_name'], populate: { job: { fields: ['title', 'documentId'] } } } }, sort: ['createdAt:desc'], pagination: { page: page, pageSize: pageSize } };
    const response = await apiClient.get('/task-logs', { params: query, paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }) });
    const logs = response.data.data.map(normalizeStrapiData);
    const flattenedLogs = logs.map((log: any) => ({ ...log, taskName: log.job_task?.task_name || "Unknown Task", jobTitle: log.job_task?.job?.title || "Unknown Job", jobId: log.job_task?.job?.documentId, taskId: log.job_task?.documentId }));
    return { data: flattenedLogs, meta: response.data.meta };
  } catch (error) { return { data: [], meta: null }; }
};

// ==========================================
// 👤 USER MANAGEMENT & ROLES
// ==========================================
export const getAllUsers = async () => { try { const response = await apiClient.get('/users'); if (Array.isArray(response.data)) return response.data; if (response.data && Array.isArray(response.data.data)) return response.data.data; return []; } catch (error) { return []; } };
export const getDefaultRole = async () => { try { const response = await apiClient.get('/users-permissions/roles'); const authRole = response.data.roles.find((r: any) => r.type === 'authenticated'); return authRole ? authRole.id : null; } catch (error) { return null; } };
export const createUser = async (userData: any) => await apiClient.post('/users', userData);
export const updateUser = async (userId: string | number, userData: any) => await apiClient.put(`/users/${userId}`, userData);
export const deleteUser = async (userId: string | number) => await apiClient.delete(`/users/${userId}`);
export const getRoles = async () => { const response = await apiClient.get('/users-permissions/roles'); return response.data.roles; };

// ==========================================
// 👷 PROJECT MEMBERS
// ==========================================
export const getProjectMembers = async (projectDocId: string) => {
  const query = { filters: { project_site: { documentId: { $eq: projectDocId } } }, populate: { user: { fields: ['username', 'email', 'position'], populate: { avatar: true } } }, sort: ['start_date:desc'] };
  const response = await apiClient.get('/project-members', { params: query, paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }) });
  const members = response.data.data.map(normalizeStrapiData);
  return members.map((m: any) => { if (m.user && m.user.data) m.user = normalizeStrapiData(m.user.data); return m; });
};
export const addProjectMember = async (data: any) => await apiClient.post('/project-members', { data: { project_site: data.projectSiteId, user: data.userId, role_in_project: data.role, responsibility: data.responsibility, start_date: data.start_date, end_date: data.end_date || null } });
export const deleteProjectMember = async (documentId: string) => await apiClient.delete(`/project-members/${documentId}`);
export const updateProjectMember = async (documentId: string, data: any) => await apiClient.put(`/project-members/${documentId}`, { data: { role_in_project: data.role, responsibility: data.responsibility, start_date: data.start_date, end_date: data.end_date || null } });

// ==========================================
// 🖼️ PROJECT GALLERY
// ==========================================
export const getProjectGalleries = async (projectDocId: string) => { const query = { filters: { project: { documentId: { $eq: projectDocId } } }, populate: ['photos'], sort: ['createdAt:desc'] }; const response = await apiClient.get('/project-galleries', { params: query, paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }) }); return response.data.data.map(normalizeStrapiData); };
export const createProjectGallery = async (data: any) => await apiClient.post('/project-galleries', { data });
export const deleteProjectGallery = async (docId: string) => await apiClient.delete(`/project-galleries/${docId}`);
export const updateProjectGallery = async (docId: string, data: any) => await apiClient.put(`/project-galleries/${docId}`, { data });
export const getGalleryPhotos = async (galleryId: string) => {
  try {
    const response = await apiClient.get(`/project-galleries/${galleryId}?populate=*`);
    const rootData = response.data.data || response.data; const attributes = rootData.attributes || rootData;   
    let rawPhotos: any[] = [];
    if (attributes.photos) { if (Array.isArray(attributes.photos)) rawPhotos = attributes.photos; else if (attributes.photos.data && Array.isArray(attributes.photos.data)) rawPhotos = attributes.photos.data; }
    const cleanPhotos = rawPhotos.map((item: any) => { const attrs = item.attributes || item; let url = attrs.url; if (url && url.startsWith('/')) url = `${STRAPI_URL}${url}`; return { id: item.id, documentId: item.documentId || item.id, url: url, createdAt: attrs.createdAt }; });
    return { photos: cleanPhotos };
  } catch (error) { return { photos: [] }; }
};
export const addPhotosToGallery = async (galleryDocId: string, newPhotoIds: string[]) => await apiClient.put(`/project-galleries/${galleryDocId}`, { data: { photos: { connect: newPhotoIds } } });
export const removePhotoFromGallery = async (galleryId: string, photoId: string) => await apiClient.put(`/project-galleries/${galleryId}`, { data: { photos: { disconnect: [photoId] } } });

// ==========================================
// 📦 MATERIAL & STOCK
// ==========================================
export const getMaterialLogs = async (projectDocId: string) => { const query = { filters: { project_site: { documentId: { $eq: projectDocId } } }, populate: { product: { populate: ['image'] } }, sort: ['log_date:desc'] }; const response = await apiClient.get('/project-material-logs', { params: query, paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }) }); const logs = response.data.data.map(normalizeStrapiData); return logs.map((log: any) => { if (log.product?.data) log.product = normalizeStrapiData(log.product.data); return log; }); };
export const getAllProducts = async () => { const response = await apiClient.get('/products?populate=*'); return response.data.data.map(normalizeStrapiData); };
export const getAllProductsSafe = async () => {
    try {
        const response = await apiClient.get('/products?populate=*&sort=name:asc');
        const rootData = response.data.data || response.data; let items: any[] = [];
        if (Array.isArray(rootData)) items = rootData; else if (rootData.data && Array.isArray(rootData.data)) items = rootData.data;
        return items.map((item: any) => {
            const attrs = item.attributes || item; let imgUrl = null;
            if (attrs.image) { const imgData = attrs.image.data || attrs.image; if (Array.isArray(imgData) && imgData.length > 0) imgUrl = imgData[0].attributes?.url || imgData[0].url; else if (imgData && !Array.isArray(imgData)) imgUrl = imgData.attributes?.url || imgData.url; }
            let catName = "ทั่วไป"; if (attrs.category) { const catData = attrs.category.data || attrs.category; if (catData) { const catObj = Array.isArray(catData) ? catData[0] : catData; const catAttrs = catObj.attributes || catObj; if (catAttrs?.name) catName = catAttrs.name; } }
            return { id: item.id, documentId: item.documentId || item.id, name: attrs.name, unit: attrs.unit || 'ชิ้น', image: imgUrl, category: catName };
        });
    } catch (error) { return []; }
};
export const getMaterialLogsSafe = async (projectDocId: string) => {
    try {
        const query = { filters: { project_site: { documentId: { $eq: projectDocId } } }, populate: { product: { populate: '*' } }, sort: ['log_date:desc'] };
        const response = await apiClient.get('/project-material-logs', { params: query, paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }) });
        const rootData = response.data.data || response.data; let logs: any[] = [];
        if (Array.isArray(rootData)) logs = rootData; else if (rootData.data && Array.isArray(rootData.data)) logs = rootData.data;
        return logs.map((log: any) => {
            const attrs = log.attributes || log; let productData = null;
            if (attrs.product) {
                const pRaw = attrs.product.data || attrs.product; const pAttrs = pRaw.attributes || pRaw; let pImg = null;
                if (pAttrs.image) { const iRaw = pAttrs.image.data || pAttrs.image; if(Array.isArray(iRaw) && iRaw.length>0) pImg = iRaw[0].attributes?.url || iRaw[0].url; else if(iRaw && !Array.isArray(iRaw)) pImg = iRaw.attributes?.url || iRaw.url; }
                productData = { name: pAttrs.name || "สินค้าไม่ระบุชื่อ", unit: pAttrs.unit || "-", image: pImg };
            }
            return { id: log.id, documentId: log.documentId || log.id, quantity: attrs.quantity, requester: attrs.requester_name, date: attrs.log_date, note: attrs.note, product: productData };
        });
    } catch (error) { return []; }
};
export const createMaterialLog = async (data: any) => await apiClient.post('/project-material-logs', { data });
export const updateMaterialLog = async (logId: string, quantity: number) => await apiClient.put(`/project-material-logs/${logId}`, { data: { quantity } });
export const deleteMaterialLog = async (logId: string) => await apiClient.delete(`/project-material-logs/${logId}`);
export const getMaterialPresets = async () => {
  try {
    const query = { populate: { items: { populate: { product: { populate: '*' } } } }, sort: ['createdAt:asc'] };
    const response = await apiClient.get('/material-presets', { params: query, paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }) });
    const rawData = response.data.data || [];
    return rawData.map((item: any) => {
        const attrs = item.attributes || item; let cleanItems: any[] = [];
        if (attrs.items) { cleanItems = attrs.items.map((subItem: any) => { let prod = subItem.product; if (prod && prod.data) { const prodAttrs = prod.data.attributes || prod.data; prod = { id: prod.data.id, documentId: prod.data.documentId, name: prodAttrs.name, unit: prodAttrs.unit }; } return { quantity: subItem.quantity, product: prod }; }); }
        return { id: item.id, documentId: item.documentId, title: attrs.title || "No Title", icon: attrs.icon || "📦", items: cleanItems };
    });
  } catch (error) { return []; }
};
export const createMaterialPreset = async (data: { title: string, icon: string, items: any[] }) => await apiClient.post('/material-presets', { data: { title: data.title, icon: data.icon || '📦', items: data.items } });
export const updateMaterialPreset = async (presetId: string, data: { title: string, icon: string, items: any[] }) => await apiClient.put(`/material-presets/${presetId}`, { data: { title: data.title, icon: data.icon, items: data.items } });
export const deleteMaterialPreset = async (presetId: string) => await apiClient.delete(`/material-presets/${presetId}`);

// ==========================================
// 📅 USER ACTIVITIES & SCHEDULE 
// ==========================================
export const getUserActivities = async (userId: string | number, dateString: string) => {
  try {
    const query = { filters: { users_permissions_user: { id: { $eq: userId } }, action_date: { $eq: dateString } }, populate: '*', sort: ['start_time:asc'] };
    const response = await apiClient.get('/user-activities', { params: query, paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }) });
    const rawData = response.data.data.map(normalizeStrapiData);
    
    return rawData.map((act: any) => {
      const projectData = act.project_site || act.project_sites; 
      const realProject = Array.isArray(projectData) ? projectData[0] : projectData;
      const fixedPhotos = (act.photos || []).map((photo: any) => { if (photo.url && photo.url.startsWith('/')) { return { ...photo, url: `${STRAPI_URL}${photo.url}` }; } return photo; });
      let displayLocation = "ไม่ระบุสถานที่";
      if (realProject) { if (act.location_text) { displayLocation = `${realProject.name} (${act.location_text})`; } else { displayLocation = realProject.name; } } else { displayLocation = act.location_text || "ไม่ระบุสถานที่"; }

      return {
        id: act.id, documentId: act.documentId, title: act.title, details: act.details || "", type: act.activity_type,
        startTime: act.start_time?.substring(0, 5), endTime: act.end_time?.substring(0, 5) || null,
        location: displayLocation, projectId: realProject?.documentId || realProject?.id || "",
        locationText: act.location_text || "", coordinates: act.coordinates || null, isProject: !!realProject, photos: fixedPhotos 
      };
    });
  } catch (error) { return []; }
};

export const createUserActivity = async (data: any) => {
  try {
    let mediaIds: any[] = [];
    if (data.photos && data.photos.length > 0) { const uploadedFiles = await uploadFilesOnly(data.photos); mediaIds = uploadedFiles.map((f: any) => f.id); }
    const fixedType = data.type === 'Programming' ? 'Programming' : data.type; 
    const payload = { data: { title: data.title, details: data.details, action_date: data.date, start_time: formatTimeForStrapi(data.start), end_time: formatTimeForStrapi(data.end), activity_type: fixedType, location_type: data.projectId ? 'Project' : (data.locationText ? 'Other' : 'Office'), location_text: data.locationText || null, users_permissions_user: data.userId, project_site: data.projectId || null, coordinates: data.coordinates || null, photos: mediaIds } };
    return await apiClient.post('/user-activities', payload);
  } catch (error: any) { throw error; }
};

export const updateUserActivity = async (docId: string, data: any) => {
  try {
     let newMediaIds: any[] = [];
     if (data.photos && data.photos.length > 0) { const uploadedFiles = await uploadFilesOnly(data.photos); newMediaIds = uploadedFiles.map((f: any) => f.id); }
     const fixedType = data.type === 'Programming' ? 'Programming' : data.type; 
     const payload: any = { data: { title: data.title, details: data.details, start_time: formatTimeForStrapi(data.start), end_time: formatTimeForStrapi(data.end), activity_type: fixedType, location_type: data.projectId ? 'Project' : (data.locationText ? 'Other' : 'Office'), location_text: data.locationText || null, project_site: data.projectId || null, coordinates: data.coordinates || null } };
     if (newMediaIds.length > 0) { payload.data.photos = { connect: newMediaIds }; }
     return await apiClient.put(`/user-activities/${docId}`, payload);
  } catch (error: any) { throw error; }
};

export const deleteUserActivity = async (docId: string) => await apiClient.delete(`/user-activities/${docId}`);

// ==========================================
// 💡 REPORT HELPERS (เปลี่ยนมารับ Array ตรงๆ ไม่ง้อ API เพื่อให้ Real-time)
// ==========================================
const timeToMinutes = (timeStr: string) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h * 60) + m;
};

const minutesToTime = (mins: number) => {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

// ✅ เปลี่ยนการทำงาน ไม่ต้อง async และให้รับข้อมูลมาจากหน้าจอตรงๆ
export const getDailyScheduleWithGaps = (activities: any[]) => {
  const scheduleList: any[] = [];
  
  let startDayMins = 6 * 60; // เริ่ม 06:00
  if (activities.length > 0 && activities[0].startTime) {
      const firstTaskMins = timeToMinutes(activities[0].startTime);
      if (firstTaskMins < startDayMins) {
          startDayMins = firstTaskMins; 
      }
  }

  const endDayMins = 23 * 60;  // จบ 23:00
  let currentMins = startDayMins;

  activities.forEach((act: any) => {
    if (!act.startTime) return;
    
    const actStartMins = timeToMinutes(act.startTime);
    const actEndMins = act.endTime ? timeToMinutes(act.endTime) : actStartMins + 60;

    if (actStartMins > currentMins && currentMins >= startDayMins) {
      scheduleList.push({
        isFreeTime: true,
        timeDisplay: `${minutesToTime(currentMins)} - ${minutesToTime(actStartMins)}`,
        title: "< ว่าง >", icon: "☕", location: "", details: ""
      });
    }

    let icon = '✅';
    if (act.type === 'Survey' || act.type === 'Site inspection') icon = '👷';
    if (act.type === 'Design') icon = '🎨';
    if (act.type === 'Programming') icon = '💻';

    scheduleList.push({
      isFreeTime: false,
      timeDisplay: `${minutesToTime(actStartMins)} - ${minutesToTime(actEndMins)}`,
      title: act.title, icon: icon,
      location: act.location && act.location !== "ไม่ระบุสถานที่" ? act.location : "",
      details: act.details || ""
    });

    currentMins = Math.max(currentMins, actEndMins);
  });

  if (currentMins < endDayMins) {
    scheduleList.push({
      isFreeTime: true,
      timeDisplay: `${minutesToTime(currentMins)} - 23:00`,
      title: "< ว่าง >", icon: "☕", location: "", details: ""
    });
  }

  return scheduleList;
};

export const generateLineReport = (userName: string, dateString: string, activities: any[]) => {
  const scheduleList = getDailyScheduleWithGaps(activities);
  if (!scheduleList || scheduleList.length === 0) return "วันนี้ยังไม่มีบันทึกกิจกรรมครับ";

  let report = `📅 *แผนการทำงานประจำวัน (${dateString})*\n`;
  report += `ชื่อ ${userName}\n`;
  report += `--------------------------------\n`;

  scheduleList.forEach((item: any) => {
    report += `${item.icon} *${item.timeDisplay}* : ${item.title}\n`;
    if (item.location) report += `   📍 ${item.location}\n`;
    if (item.details) report += `   📝 ${item.details}\n`;
    if (item.location || item.details) report += `\n`;
  });

  report += `--------------------------------\n`;
  report += `#SiriwongInventory`; 
  return report;
};

export const generateAIPromptJSON = (userName: string, dateString: string, activities: any[]) => {
  const scheduleList = getDailyScheduleWithGaps(activities);
  
  const cleanSchedule = scheduleList.map(item => ({
    time: item.timeDisplay,
    activity: item.title,
    location: item.location || null,
    details: item.details || null // ✨ เพิ่มบรรทัดนี้ เพื่อส่ง "รายละเอียดเพิ่มเติม" ให้ AI
  }));

  // ส่งแค่ Data เพียวๆ เพราะ Instruction ไปอยู่ใน Master Gem แล้ว
  const jsonFormat = {
    date: dateString,
    employee_name: userName,
    company: "Siriwong Inventory",
    daily_schedule: cleanSchedule
  };

  return JSON.stringify(jsonFormat, null, 2);
};

// ==========================================
// 📋 SURVEY LOG SYSTEM 
// ==========================================
export const getSurveyLogs = async (projectDocId: string) => { const query = { filters: { project_site: { documentId: { $eq: projectDocId } } }, populate: ['photos'], sort: ['createdAt:desc'] }; const response = await apiClient.get('/survey-logs', { params: query, paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }) }); return response.data.data; };
export const createSurveyLog = async (data: any) => { try { let photoIds: number[] = []; if (data.files && data.files.length > 0) { const uploadedMedia = await uploadFilesOnly(data.files); photoIds = uploadedMedia.map((file: any) => file.id); } const payload = { data: { topic: data.topic, description: data.description, severity: data.severity, project_site: data.project_site, photos: photoIds, publishedAt: new Date().toISOString() } }; const response = await apiClient.post('/survey-logs', payload); return response.data; } catch (error: any) { throw error; } };
export const updateSurveyLog = async (documentId: string, data: any) => { const response = await apiClient.put(`/survey-logs/${documentId}`, { data: { topic: data.topic, description: data.description, severity: data.severity } }); return response.data; };
export const deleteSurveyLog = async (documentId: string) => await apiClient.delete(`/survey-logs/${documentId}`);

// ==========================================
// 📚 DICTIONARY API
// ==========================================
export const fetchDictionary = async (category: string) => { try { const response = await apiClient.get(`/dictionaries?filters[category][$eq]=${category}&pagination[limit]=100`); return (response.data?.data || []).map((item: any) => item.attributes?.word || item.word || ""); } catch (error) { return []; } };
export const createDictionaryWord = async (word: string, category: string) => { try { await apiClient.post(`/dictionaries`, { data: { word: word, category: category } }); return true; } catch (error) { return false; } };