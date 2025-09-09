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

export const changeFinStatus = async payload => {
  try {
    return await axios.post('/api/change-status-by-fin', payload);
  } catch (error) {
    throw error;
  }
};

export const changeBuhStatus = async payload => {
  try {
    return await axios.post('/api/change-status-by-buh', payload);
  } catch (error) {
    throw error;
  }
};
