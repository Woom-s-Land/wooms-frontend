import axios from 'axios';

const instance = axios.create({
  baseURL: 'https://localhost/api',
  withCredentials: true,
});

export default instance;
