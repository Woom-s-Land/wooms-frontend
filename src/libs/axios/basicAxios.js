import axios from 'axios';

const instance = axios.create({
  // baseURL: 'https://wooms.duckdns.org/api',
  baseURL: 'http://localhost:8080/api',
  withCredentials: true,
});

export default instance;
