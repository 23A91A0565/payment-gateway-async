import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'X-Api-Key': 'key_test_abc123',
    'X-Api-Secret': 'secret_test_xyz789'
  }
});

export default api;
