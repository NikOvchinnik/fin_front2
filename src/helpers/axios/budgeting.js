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

export const getBudgetingStatuses = async () => {
  try {
    return await axios.get('/api/budgeting-statuses/budgeting_statuses');
  } catch (error) {
    throw error;
  }
};

export const getBudgetingFinancial = async ({ startDate, endDate, deleted }) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (deleted != null) params.deleted = deleted;
    return await axios.get('/api/budgeting/financial-budgeting', { params });
  } catch (error) {
    throw error;
  }
};

export const getBudgetingHd = async ({ startDate, endDate, deleted }) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (deleted != null) params.deleted = deleted;
    return await axios.get('/api/budgeting/hd-budgeting', { params });
  } catch (error) {
    throw error;
  }
};

export const getBudgetingCEO = async ({ startDate, endDate, deleted }) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (deleted != null) params.deleted = deleted;
    return await axios.get('/api/budgeting/ceo-budgeting', { params });
  } catch (error) {
    throw error;
  }
};

export const getMyBudgeting = async ({ userId, startDate, endDate, deleted }) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (deleted != null) params.deleted = deleted;
    return await axios.get(`/api/budgeting/personal-budgeting/${userId}`, {
      params,
    });
  } catch (error) {
    throw error;
  }
};

export const getBudgetingById = async ({ id, deleted }) => {
  try {
    const params = {};
    if (deleted != null) params.deleted = deleted;
    return await axios.get(`/api/budgeting/budgeting-by-id/${id}`, { params });
  } catch (error) {
    throw error;
  }
};

export const postMyBudgeting = async payload => {
  try {
    return await axios.post('/api/budgeting/create-draft', payload);
  } catch (error) {
    throw error;
  }
};

export const updateMyBudgeting = async payload => {
  try {
    return await axios.post('/api/budgeting/update-budgeting', payload);
  } catch (error) {
    throw error;
  }
};

export const deleteMyBudgeting = async id => {
  try {
    return await axios.delete(`/api/budgeting/delete-budgeting/${id}`);
  } catch (error) {
    throw error;
  }
};

export const restoreBudgeting = async id => {
  try {
    return await axios.post(`/api/budgeting/restore-budgeting/${id}`);
  } catch (error) {
    throw error;
  }
};

export const sendBudgeting = async id => {
  try {
    return await axios.post(`/api/budgeting/send-budgeting/${id}`);
  } catch (error) {
    throw error;
  }
};

export const updateBudgetingStatus = async (id, payload) => {
  try {
    return await axios.post(
      `/api/budgeting/update-budgeting-status/${id}`,
      payload
    );
  } catch (error) {
    throw error;
  }
};

export const changeBudgetingStatusBulk = async payload => {
  try {
    return await axios.post(
      '/api/budgeting/bulk-update-budgeting-status',
      buildBulkStatusParams(payload)
    );
  } catch (error) {
    throw error;
  }
};

export const returnBudgetingToRevision = async (id, payload) => {
  try {
    if (payload) {
      return await axios.post(
        `/api/budgeting/return-budgeting-to-revision/${id}`,
        payload
      );
    }
    return await axios.post(
      `/api/budgeting/return-budgeting-to-revision/${id}`
    );
  } catch (error) {
    throw error;
  }
};

export const exportBudgetingToGoogle = async year => {
  try {
    return await axios.post('/api/budgeting/export-budgeting-to-google', {
      year,
    });
  } catch (error) {
    throw error;
  }
};
