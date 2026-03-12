import axios from './axiosConfig';

export const getFinRequests = async ({ startDate, endDate }) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return await axios.get('/api/financial-request/all-requests-for-fin', {
      params,
    });
  } catch (error) {
    throw error;
  }
};

export const getBuhRequests = async ({ startDate, endDate }) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return await axios.get('/api/financial-request/all-requests-for-buh', {
      params,
    });
  } catch (error) {
    throw error;
  }
};

export const getMyRequests = async ({ userId, startDate, endDate }) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return await axios.get(
      `/api/financial-request/personal-requests/${userId}`,
      { params }
    );
  } catch (error) {
    throw error;
  }
};

export const getMyRefunds = async ({ userId, startDate, endDate }) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return await axios.get(
      `/api/financial-request/personal-refund-requests/${userId}`,
      {
        params,
      }
    );
  } catch (error) {
    throw error;
  }
};

export const getRequestById = async ({ id }) => {
  try {
    return await axios.get(`/api/financial-request/request-by-id/${id}`);
  } catch (error) {
    throw error;
  }
};

export const createRequest = async payload => {
  try {
    return await axios.post('/api/financial-request/create-draft', payload);
  } catch (error) {
    throw error;
  }
};

export const updateRequest = async payload => {
  try {
    return await axios.post('/api/financial-request/update-request', payload);
  } catch (error) {
    throw error;
  }
};

export const deleteRequest = async id => {
  try {
    return await axios.delete(`/api/financial-request/delete-request/${id}`);
  } catch (error) {
    throw error;
  }
};

// Delete request for CEO (Finance and Buh). 
export const deleteRequestCEO = async id => {
  try {
    return await axios.delete(
      `/api/financial-request/delete-fin-request/${id}`
    );
  } catch (error) {
    throw error;
  }
};

export const sendRequest = async id => {
  try {
    return await axios.post(`/api/financial-request/send-draft/${id}`);
  } catch (error) {
    throw error;
  }
};

export const deleteLink = async id => {
  try {
    return await axios.delete(
      `/api/financial-request/delete-request-files/${id}`
    );
  } catch (error) {
    throw error;
  }
};

export const sendFilesRequest = async payload => {
  try {
    return await axios.post(
      '/api/financial-request/update-status-and-files',
      payload
    );
  } catch (error) {
    throw error;
  }
};

export const returnRequestToRevision = async (id, payload) => {
  try {
    if (payload) {
      return await axios.post(
        `/api/financial-request/return-request-to-revision/${id}`,
        payload
      );
    }
    return await axios.post(
      `/api/financial-request/return-request-to-revision/${id}`
    );
  } catch (error) {
    throw error;
  }
};
