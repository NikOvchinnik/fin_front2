import axios from './axiosConfig';

export const getSubdivisions = async () => {
  try {
    return await axios.get('/api/subdivisions/all');
  } catch (error) {
    throw error;
  }
};
