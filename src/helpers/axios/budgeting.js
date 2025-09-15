import axios from './axiosConfig';

export const getBudgetingStatuses = async () => {
  try {
    return await axios.get('/api/budgeting_statuses');
  } catch (error) {
    throw error;
  }
};

export const getBudgetingFinancial = async ({ startDate, endDate }) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return await axios.get('/api/financial-budgeting', { params });
  } catch (error) {
    throw error;
  }
};

export const getBudgetingHd = async ({ startDate, endDate }) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return await axios.get('/api/hd-budgeting', { params });
  } catch (error) {
    throw error;
  }
};

export const getBudgetingCEO = async ({ startDate, endDate }) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return await axios.get('/api/ceo-budgeting', { params });
  } catch (error) {
    throw error;
  }
};

export const getMyBudgeting = async ({ userId, startDate, endDate }) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return await axios.get(`/api/personal-budgeting/${userId}`, { params });
  } catch (error) {
    throw error;
  }
};

export const postMyBudgeting = async payload => {
  try {
    return await axios.post('/api/save-budgeting', payload);
  } catch (error) {
    throw error;
  }
};

export const deleteMyBudgeting = async id => {
  try {
    return await axios.delete(`/api/delete-budgeting/${id}`);
  } catch (error) {
    throw error;
  }
};

export const sendBudgeting = async id => {
  try {
    return await axios.post(`/api/send-budgeting/${id}`);
  } catch (error) {
    throw error;
  }
};

export const updateBudgetingStatus = async (id, payload) => {
  try {
    return await axios.post(`/api/update-budgeting-status/${id}`, payload);
  } catch (error) {
    throw error;
  }
};