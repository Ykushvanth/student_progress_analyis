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

export async function getDepartmentFaculty(departmentId) {
  return makeRequest(`/hod/departments/${departmentId}/faculty`, {
    method: 'GET',
  });
}

export async function getCourses(departmentId, academicYearId, semesterId, batchId) {
  const params = new URLSearchParams();
  if (departmentId) params.append('department_id', departmentId);
  if (academicYearId) params.append('academic_year_id', academicYearId);
  if (semesterId) params.append('semester_id', semesterId);
  if (batchId) params.append('batch_id', batchId);

  return makeRequest(`/hod/courses?${params.toString()}`, {
    method: 'GET',
  });
}

export async function getAnalytics(courseId) {
  return makeRequest(`/hod/analytics?course_id=${courseId}`, {
    method: 'GET',
  });
}

export const hodApi = {
  getDepartmentFaculty,
  getCourses,
  getAnalytics,
};
