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

export const changeFinStatusBulk = async payload => {
  try {
    return await axios.post('/api/bulk-update-fin-status', payload);
  } catch (error) {
    throw error;
  }
};

export const changeBudgetingStatusBulk = async payload => {
  try {
    return await axios.post('/api/bulk-update-budgeting-status', payload);
  } catch (error) {
    throw error;
  }
};
