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
