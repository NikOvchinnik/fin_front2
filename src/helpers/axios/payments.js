import axios from './axiosConfig';

export const getPaymentForms = async () => {
  try {
    return await axios.get('/api/payment-forms');
  } catch (error) {
    throw error;
  }
};

export const getCurrencies = async () => {
  try {
    return await axios.get('/api/currencies');
  } catch (error) {
    throw error;
  }
};

export const getExpenseCategories = async () => {
  try {
    return await axios.get('/api/expense-categories');
  } catch (error) {
    throw error;
  }
};