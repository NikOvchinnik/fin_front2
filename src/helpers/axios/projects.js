import axios from './axiosConfig';

export const getProjects = async () => {
  try {
    return await axios.get('/api/projects');
  } catch (error) {
    throw error;
  }
};
