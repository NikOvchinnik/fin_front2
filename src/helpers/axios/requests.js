import axios from './axiosConfig';

const buildBulkStatusParams = payload => {
  const params = new URLSearchParams();
  const ids = payload?.ids || [];

  if (ids.length) {
    params.append('ids', ids.join(','));
  }

  if (payload?.status_id != null) {
    params.append('status_id', payload.status_id);
  }

  if (payload?.comment != null) {
    params.append('comment', payload.comment);
  }

  return params;
};

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

export const changeFinStatus = async payload => {
  try {
    return await axios.post('/api/financial-request/change-status-by-fin', payload);
  } catch (error) {
    throw error;
  }
};

export const changeBuhStatus = async payload => {
  try {
    return await axios.post('/api/financial-request/change-status-by-buh', payload);
  } catch (error) {
    throw error;
  }
};

export const changeFinStatusBulk = async payload => {
  try {
    return await axios.post(
      '/api/financial-request/bulk-update-fin-status',
      buildBulkStatusParams(payload)
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

export const exportRequestsToGoogle = async year => {
  try {
    return await axios.post(
      '/api/financial-request/export-fin-requests-to-google',
      {
        year,
      }
    );
  } catch (error) {
    throw error;
  }
};
