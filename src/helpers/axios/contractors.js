import axios from './axiosConfig';

export const getContractors = async () => {
  try {
    return await axios.get('/api/contractors');
  } catch (error) {
    throw error;
  }
};

export const postContractors = async payload => {
  try {
    return await axios.post('/api/contractors', payload);
  } catch (error) {
    throw error;
  }
};