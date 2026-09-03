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

export const postEmployeeRate = async (id, payload) => {
  try {
    return await axios.post(`/api/employees/${id}/rate`, payload);
  } catch (error) {
    throw error;
  }
};

export const putEmployeeRate = async (id, rateId, payload) => {
  try {
    return await axios.put(`/api/employees/${id}/rate/${rateId}`, payload);
  } catch (error) {
    throw error;
  }
};
