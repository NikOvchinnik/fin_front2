import axios from 'axios';

// const isLocalhost = window.location.hostname === 'localhost';

const axiosConfig = axios.create({
  baseURL: 'https://fin-app-back-4jfdy.ondigitalocean.app',
  headers: {
    Accept: 'application/json',
  },
});

axiosConfig.interceptors.request.use(
  config => {
    const bookingToken = localStorage.getItem('finAuthToken');
    if (bookingToken) {
      config.headers['Authorization'] = `Bearer ${bookingToken}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

axiosConfig.interceptors.response.use(
  response => {
    return response.data;
  },
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('finAuthToken');
    }
    return Promise.reject(error);
  }
);

export default axiosConfig;
