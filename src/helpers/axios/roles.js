import axios from './axiosConfig';

export const getRoles = async () => {
  try {
    return await axios.get('/api/roles/all');
  } catch (error) {
    throw error;
  }
};
