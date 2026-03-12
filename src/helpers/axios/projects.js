import axios from './axiosConfig';

export const getProjects = async () => {
  try {
    return await axios.get('/api/projects/all');
  } catch (error) {
    throw error;
  }
};

export const postProject = async payload => {
  try {
    return await axios.post('/api/projects/create', payload);
  } catch (error) {
    throw error;
  }
};

export const getProjectById = async projectId => {
  try {
    return await axios.get(`/api/projects/by-id/${projectId}`);
  } catch (error) {
    throw error;
  }
};

export const patchProject = async (projectId, payload) => {
  try {
    return await axios.put(`/api/projects/update/${projectId}`, payload);
  } catch (error) {
    throw error;
  }
};

export const deleteProject = async projectId => {
  try {
    return await axios.delete(`/api/projects/delete/${projectId}`);
  } catch (error) {
    throw error;
  }
};
