import axios from './axiosConfig';

export const getFinStatuses = async () => {
  try {
    return await axios.get('/api/statuses-for-fin');
  } catch (error) {
    throw error;
  }
};

export const getMainStatuses = async () => {
  try {
    return await axios.get('/api/main-statuses');
  } catch (error) {
    throw error;
  }
};
