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

const buildBulkStatusFormData = payload => {
  const formData = new FormData();
  const ids = payload?.ids || [];

  ids.forEach(id => {
    formData.append('ids', id);
  });

  if (payload?.status_id != null) {
    formData.append('status_id', payload.status_id);
  }

  if (payload?.comment != null) {
    formData.append('comment', payload.comment);
  }

  return formData;
};

export const changeFinStatusBulk = async payload => {
  try {
    return await axios.post(
      '/api/bulk-update-fin-status',
      buildBulkStatusFormData(payload)
    );
  } catch (error) {
    throw error;
  }
};

export const changeBudgetingStatusBulk = async payload => {
  try {
    return await axios.post(
      '/api/bulk-update-budgeting-status',
      buildBulkStatusFormData(payload)
    );
  } catch (error) {
    throw error;
  }
};
