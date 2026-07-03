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

export async function getDepartments(schoolId) {
  return makeRequest(`/dean/school/${schoolId}/departments`, {
    method: 'GET',
  });
}

export async function getAnalytics(departmentId, batchId, academicYearId, semesterId) {
  const params = new URLSearchParams();
  if (departmentId) params.append('department_id', departmentId);
  if (batchId) params.append('batch_id', batchId);
  if (academicYearId) params.append('academic_year_id', academicYearId);
  if (semesterId) params.append('semester_id', semesterId);

  return makeRequest(`/dean/analytics?${params.toString()}`, {
    method: 'GET',
  });
}

export const deanApi = {
  getDepartments,
  getAnalytics,
};
