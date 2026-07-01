import axios from './axiosConfig';

export const getUnits = async () => {
  try {
    return await axios.get('/api/units/all');
  } catch (error) {
    throw error;
  }
};

export const postUnit = async payload => {
  try {
    return await axios.post('/api/units/create', payload);
  } catch (error) {
    throw error;
  }
};

export const getUnitById = async unitId => {
  try {
    return await axios.get(`/api/units/by-id/${unitId}`);
  } catch (error) {
    throw error;
  }
};

export const patchUnit = async (unitId, payload) => {
  try {
    return await axios.put(`/api/units/update/${unitId}`, payload);
  } catch (error) {
    throw error;
  }
};

export const deleteUnit = async unitId => {
  try {
    return await axios.delete(`/api/units/delete/${unitId}`);
  } catch (error) {
    throw error;
  }
};
