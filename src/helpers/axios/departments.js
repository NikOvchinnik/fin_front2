import axios from './axiosConfig';

export const getDepartments = async () => {
  try {
    return await axios.get('/api/departments');
  } catch (error) {
    throw error;
  }
};