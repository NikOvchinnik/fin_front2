import axios from './axiosConfig';

export const getFinRequests = async ({ startDate, endDate }) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return await axios.get('/api/all-requests-for-fin', { params });
  } catch (error) {
    throw error;
  }
};

export const getMyRequests = async ({ userId, startDate, endDate }) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return await axios.get(`/api/personal-requests/${userId}`, { params });
  } catch (error) {
    throw error;
  }
};

export const getMyRefunds = async ({ userId, startDate, endDate }) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return await axios.get(`/api/personal-refund-requests/${userId}`, {
      params,
    });
  } catch (error) {
    throw error;
  }
};
