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

export const changeFinStatusBulk = async payload => {
  try {
    return await axios.post(
      '/api/bulk-update-fin-status',
      buildBulkStatusParams(payload)
    );
  } catch (error) {
    throw error;
  }
};

export const changeBudgetingStatusBulk = async payload => {
  try {
    return await axios.post(
      '/api/bulk-update-budgeting-status',
      buildBulkStatusParams(payload)
    );
  } catch (error) {
    throw error;
  }
};
