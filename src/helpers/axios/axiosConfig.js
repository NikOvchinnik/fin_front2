import axios from 'axios';
import { store } from '../../redux/store';

const isLocalhost = window.location.hostname === 'localhost';
//const isLocalhost = false;

const axiosConfig = axios.create({
  baseURL: isLocalhost
    ? 'http://127.0.0.1:5000'
    : 'https://fin-app-back-4jfdy.ondigitalocean.app',
  headers: {
    Accept: 'application/json',
  },
});

axiosConfig.interceptors.request.use(
  config => {
    const state = store.getState();
    const bookingToken = state.auth?.token;
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
