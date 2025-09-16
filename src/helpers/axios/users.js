import axios from './axiosConfig';

export const loginUser = async formData => {
  try {
    const res = await axios.post('/api/login', formData);
    return res;
  } catch (error) {
    throw error;
  }
};

export const forgotPassword = async formData => {
  try {
    const res = await axios.post('/api/forgot_password', formData);
    return res;
  } catch (error) {
    throw error;
  }
};

export const resetPassword = async formData => {
  try {
    const res = await axios.post('/api/reset_password', formData);
    return res;
  } catch (error) {
    throw error;
  }
};

export const getUsers = async () => {
  try {
    return await axios.get('/api/get-users');
  } catch (error) {
    throw error;
  }
};

export const postUser = async credentials => {
  try {
    return await axios.post('/api/add-user', credentials);
  } catch (error) {
    throw error;
  }
};

export const patchUser = async (id, credentials) => {
  try {
    return await axios.put(`/api/update-user/${id}`, credentials);
  } catch (error) {
    throw error;
  }
};

export const deleteUser = async id => {
  try {
    return await axios.delete(`/api/delete-user/${id}`);
  } catch (error) {
    throw error;
  }
};