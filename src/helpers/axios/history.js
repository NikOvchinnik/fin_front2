import axios from './axiosConfig';

export const getRequestHistory = async (month, year) => {
  try {
    return await axios.get('/api/request_history', {
      params: { month, year },
    });
  } catch (error) {
    throw error;
  }
};

export const getRequestHistoryById = async id => {
  try {
    return await axios.get(`/api/request_history/${id}`);
  } catch (error) {
    throw error;
  }
};

export const getBudgetingHistory = async (month, year) => {
  try {
    return await axios.get('/api/budgeting_history', {
      params: { month, year },
    });
  } catch (error) {
    throw error;
  }
};

export const getBudgetingHistoryById = async id => {
  try {
    return await axios.get(`/api/budgeting_history/${id}`);
  } catch (error) {
    throw error;
  }
};