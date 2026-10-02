import axios from './axiosConfig';

export const getEmployees = async () => {
  try {
    return await axios.get('/api/employees');
  } catch (error) {
    throw error;
  }
};

export const getEmployeeLookups = async () => {
  try {
    return await axios.get('/api/employees/lookups');
  } catch (error) {
    throw error;
  }
};

export const getPayrollExpenseItems = async () => {
  try {
    return await axios.get('/api/employees/payroll-expense-items');
  } catch (error) {
    throw error;
  }
};

export const getPayrollReview = async month => {
  try {
    return await axios.get('/api/employees/payroll-review', {
      params: month ? { month } : {},
    });
  } catch (error) {
    throw error;
  }
};

export const getPayrollMonthSettings = async month => {
  try {
    return await axios.get('/api/employees/payroll-month-settings', {
      params: { month },
    });
  } catch (error) {
    throw error;
  }
};

export const updatePayrollMonthSettings = async payload => {
  try {
    return await axios.put('/api/employees/payroll-month-settings', payload);
  } catch (error) {
    throw error;
  }
};

export const getNbuRates = async (refresh = false) => {
  try {
    return await axios.get('/api/employees/nbu-rates', {
      params: refresh ? { refresh: 'true' } : {},
    });
  } catch (error) {
    throw error;
  }
};

export const exportPayrollReviewToGoogle = async payload => {
  try {
    return await axios.post('/api/employees/payroll-review/export-to-google', payload);
  } catch (error) {
    throw error;
  }
};

export const getMyTeamEmployees = async month => {
  try {
    return await axios.get('/api/employees/my-team', {
      params: month ? { month } : {},
    });
  } catch (error) {
    throw error;
  }
};

export const updateEmployeePayrollEntry = async (id, payload) => {
  try {
    return await axios.put(`/api/employees/${id}/payroll-entry`, payload);
  } catch (error) {
    throw error;
  }
};

export const updateEmployeePayrollExpenseValue = async (id, payload) => {
  try {
    return await axios.put(`/api/employees/${id}/payroll-expense-value`, payload);
  } catch (error) {
    throw error;
  }
};

export const updateEmployeePayrollEntryStatus = async (id, payload) => {
  try {
    return await axios.put(`/api/employees/${id}/payroll-entry/status`, payload);
  } catch (error) {
    throw error;
  }
};

export const postEmployee = async payload => {
  try {
    return await axios.post('/api/employees', payload);
  } catch (error) {
    throw error;
  }
};

export const patchEmployee = async (id, payload) => {
  try {
    return await axios.put(`/api/employees/${id}`, payload);
  } catch (error) {
    throw error;
  }
};

export const postEmployeeAssignment = async (id, payload) => {
  try {
    return await axios.post(`/api/employees/${id}/assignments`, payload);
  } catch (error) {
    throw error;
  }
};

export const patchEmployeeAssignment = async (id, assignmentId, payload) => {
  try {
    return await axios.put(
      `/api/employees/${id}/assignments/${assignmentId}`,
      payload
    );
  } catch (error) {
    throw error;
  }
};

export const deleteEmployeeAssignment = async (id, assignmentId) => {
  try {
    return await axios.delete(`/api/employees/${id}/assignments/${assignmentId}`);
  } catch (error) {
    throw error;
  }
};

export const postEmployeeRate = async (id, assignmentId, payload) => {
  try {
    return await axios.post(
      `/api/employees/${id}/assignments/${assignmentId}/rate`,
      payload
    );
  } catch (error) {
    throw error;
  }
};

export const putEmployeeRate = async (id, assignmentId, rateId, payload) => {
  try {
    return await axios.put(
      `/api/employees/${id}/assignments/${assignmentId}/rate/${rateId}`,
      payload
    );
  } catch (error) {
    throw error;
  }
};
