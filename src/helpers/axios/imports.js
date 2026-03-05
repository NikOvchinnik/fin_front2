import axios from './axiosConfig';

export const importFromGoogleSheet = async payload => {
  try {
    return await axios.post('/api/import-from-google-sheet', payload);
  } catch (error) {
    throw error;
  }
};
