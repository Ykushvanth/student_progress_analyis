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

export async function getSchools() {
  return makeRequest('/master/schools', { method: 'GET' });
}

export async function getDepartments(schoolId = null) {
  const query = schoolId ? `?school_id=${schoolId}` : '';
  return makeRequest(`/master/departments${query}`, { method: 'GET' });
}

export async function getAcademicYears() {
  return makeRequest('/master/academic-years', { method: 'GET' });
}

export async function getSemesters() {
  return makeRequest('/master/semesters', { method: 'GET' });
}

export async function getBatches() {
  return makeRequest('/master/batches', { method: 'GET' });
}

export async function getSections() {
  return makeRequest('/master/sections', { method: 'GET' });
}

export async function getCourses(departmentId = null, yearOfStudy = null) {
  const params = new URLSearchParams();
  if (departmentId) params.append('department_id', departmentId);
  if (yearOfStudy) params.append('year_of_study', yearOfStudy);
  const query = params.toString() ? `?${params.toString()}` : '';
  return makeRequest(`/master/courses${query}`, { method: 'GET' });
}

export const masterApi = {
  getSchools,
  getDepartments,
  getAcademicYears,
  getSemesters,
  getBatches,
  getSections,
  getCourses,
};
