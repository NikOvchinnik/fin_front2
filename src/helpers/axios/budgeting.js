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
