import axios from './axiosConfig';

export const getFinRequests = async () => {
  try {
    return await axios.get('/api/all-requests-for-fin');
  } catch (error) {
    throw error;
  }
};
