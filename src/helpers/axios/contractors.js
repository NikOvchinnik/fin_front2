import axios from './axiosConfig';

export const getContractors = async () => {
  try {
    return await axios.get('/api/contractors/contractors');
  } catch (error) {
    throw error;
  }
};

export const postContractors = async payload => {
  try {
    return await axios.post('/api/contractors/contractors', payload);
  } catch (error) {
    throw error;
  }
};
