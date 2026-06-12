import axios from './axiosConfig';

export const getPaymentForms = async () => {
  try {
    return await axios.get('/api/payment/payment-forms');
  } catch (error) {
    throw error;
  }
};

export const getCurrencies = async () => {
  try {
    return await axios.get('/api/payment/currencies');
  } catch (error) {
    throw error;
  }
};

export const getExpenseCategories = async () => {
  try {
    return await axios.get('/api/expense/expense-categories');
  } catch (error) {
    throw error;
  }
};

export const getActiveExpenseCategories = async () => {
  try {
    return await axios.get('/api/expense/expense-categories/active');
  } catch (error) {
    throw error;
  }
};

export const updateCurrencies = async payload => {
  try {
    return await axios.post('/api/payment/update-currency', payload);
  } catch (error) {
    throw error;
  }
};
