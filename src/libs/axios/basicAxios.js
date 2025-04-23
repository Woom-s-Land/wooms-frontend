import axios from 'axios';

const instance = axios.create({
  baseURL: 'https://wooms.duckdns.org/api',
  withCredentials: true,
});

export default instance;
