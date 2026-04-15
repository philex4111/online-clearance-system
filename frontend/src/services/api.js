import axios from 'axios';

// Connect to your Backend running on port 5000
const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

// Automatically add the Token to requests if logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;