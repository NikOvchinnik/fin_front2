import axios from './axiosConfig';

export const getUnits = async () => {
  try {
    return await axios.get('/api/units/all');
  } catch (error) {
    throw error;
  }
};
