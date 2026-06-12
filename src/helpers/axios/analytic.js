import axios from './axiosConfig';

const buildParams = filters => ({
  params: {
    year: filters?.year ?? 'all',
    month: filters?.month ?? 'all',
    project: filters?.project ?? 'all',
  },
});

export const getAnalyticsPaymentForms = async filters => {
  try {
    return await axios.get(
      '/api/analytics/payment-forms',
      buildParams(filters)
    );
  } catch (error) {
    throw error;
  }
};

export const getAnalyticsExpenseCategories = async filters => {
  try {
    return await axios.get(
      '/api/analytics/expense-categories',
      buildParams(filters)
    );
  } catch (error) {
    throw error;
  }
};

export const getAnalyticsDepartments = async filters => {
  try {
    return await axios.get('/api/analytics/departments', buildParams(filters));
  } catch (error) {
    throw error;
  }
};

export const getAnalyticsCurrencies = async filters => {
  try {
    return await axios.get('/api/analytics/currencies', buildParams(filters));
  } catch (error) {
    throw error;
  }
};

export const getAnalyticsContractors = async filters => {
  try {
    return await axios.get('/api/analytics/contractors', buildParams(filters));
  } catch (error) {
    throw error;
  }
};

export const getAnalyticsTotal = async filters => {
  try {
    return await axios.get('/api/analytics/total', buildParams(filters));
  } catch (error) {
    throw error;
  }
};

export const getAnalyticsUsersRequests = async filters => {
  try {
    return await axios.get(
      '/api/analytics/users-requests',
      buildParams(filters)
    );
  } catch (error) {
    throw error;
  }
};

