const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

async function makeRequest(endpoint, options = {}) {
  const token = localStorage.getItem('access_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function register(email, password, full_name, employee_no, phone) {
  return makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, full_name, employee_no, phone }),
  });
}

export async function login(email, password) {
  return makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getCurrentUser() {
  return makeRequest('/auth/me', {
    method: 'GET',
  });
}

export const authApi = {
  register,
  login,
  getCurrentUser,
};
