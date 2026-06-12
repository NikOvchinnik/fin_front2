import axios from './axiosConfig';

export const getEmployees = async () => {
  try {
    return await axios.get('/api/employees');
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

export const importEmployees = async payload => {
  try {
    return await axios.post('/api/employees/import', payload);
  } catch (error) {
    throw error;
  }
};

