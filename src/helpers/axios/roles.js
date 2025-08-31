import axios from './axiosConfig';

export const getRoles = async () => {
  try {
    return await axios.get('/api/roles');
  } catch (error) {
    throw error;
  }
};