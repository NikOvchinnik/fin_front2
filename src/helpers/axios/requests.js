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

export const getBuhRequests = async ({ startDate, endDate }) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return await axios.get('/api/all-requests-for-buh', { params });
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

export const postRequest = async payload => {
  try {
    return await axios.post('/api/save-draft', payload);
  } catch (error) {
    throw error;
  }
};

export const deleteRequest = async id => {
  try {
    return await axios.delete(`/api/delete-draft/${id}`);
  } catch (error) {
    throw error;
  }
};

export const sendRequest = async id => {
  try {
    return await axios.post(`/api/send-draft/${id}`);
  } catch (error) {
    throw error;
  }
};

export const deleteLink = async id => {
  try {
    return await axios.delete(`/api/request-files/${id}`);
  } catch (error) {
    throw error;
  }
};

export const sendFilesRequest = async payload => {
  try {
    return await axios.post('/api/update-status-and-files', payload);
  } catch (error) {
    throw error;
  }
};
