import axios from './axiosConfig';

export const getFinStatuses = async () => {
  try {
    return await axios.get('/api/status/statuses-for-fin');
  } catch (error) {
    throw error;
  }
};

export const getMainStatuses = async () => {
  try {
    return await axios.get('/api/status/main-statuses');
  } catch (error) {
    throw error;
  }
};

export const getBuhStatuses = async () => {
  try {
    return await axios.get('/api/status/statuses-for-buh');
  } catch (error) {
    throw error;
  }
};
