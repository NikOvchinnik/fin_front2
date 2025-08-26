import axios from './axiosConfig';

export const loginUser = async formData => {
  try {
    const res = await axios.post('/api/login', formData);
    return res;
  } catch (error) {
    throw error;
  }
};

export const getUsers = async (options = '') => {
  try {
    return await axios.get('/users' + (options ? `?${options}` : ''));
  } catch (error) {
    throw error;
  }
};

export const getUserById = async id => {
  try {
    return await axios.get(`/users/${id}`);
  } catch (error) {
    throw error;
  }
};

export const postUser = async credentials => {
  try {
    return await axios.post('/users', credentials);
  } catch (error) {
    throw error;
  }
};

export const patchUser = async credentials => {
  try {
    return await axios.patch(`/users/${credentials.id}`, credentials);
  } catch (error) {
    throw error;
  }
};

export const deleteUser = async id => {
  try {
    return await axios.delete(`/users/${id}`);
  } catch (error) {
    throw error;
  }
};

export const forgotPassword = async email => {
  try {
    return await axios.post(`/auth/forgotPassword`, { email });
  } catch (error) {
    throw error;
  }
};
