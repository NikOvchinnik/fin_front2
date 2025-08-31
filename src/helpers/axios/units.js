import axios from './axiosConfig';

export const getUnits = async () => {
  try {
    return await axios.get('/api/units');
  } catch (error) {
    throw error;
  }
};