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

export async function getAssignments(academicYearId, semesterId) {
  return makeRequest(`/faculty/assignments?academic_year_id=${academicYearId}&semester_id=${semesterId}`, {
    method: 'GET',
  });
}

export async function getStudents(assignmentId) {
  return makeRequest(`/faculty/students?assignment_id=${assignmentId}`, {
    method: 'GET',
  });
}

export async function addStudentToAssignment(assignmentId, studentData) {
  return makeRequest(`/faculty/assignments/${assignmentId}/students`, {
    method: 'POST',
    body: JSON.stringify(studentData),
  });
}

export async function addStudentsBulk(assignmentId, students) {
  return makeRequest(`/faculty/assignments/${assignmentId}/students/bulk`, {
    method: 'POST',
    body: JSON.stringify({ students }),
  });
}

export async function updateInitialAnalysis(enrollmentId, initialAnalysis) {
  return makeRequest(`/faculty/students/${enrollmentId}/initial-analysis`, {
    method: 'PUT',
    body: JSON.stringify({ initial_analysis: initialAnalysis }),
  });
}

export async function updateSessional1(enrollmentId, marks) {
  return makeRequest(`/faculty/students/${enrollmentId}/sessional1`, {
    method: 'PUT',
    body: JSON.stringify({ sessional1_marks: marks }),
  });
}

export async function updateSessional2(enrollmentId, marks) {
  return makeRequest(`/faculty/students/${enrollmentId}/sessional2`, {
    method: 'PUT',
    body: JSON.stringify({ sessional2_marks: marks }),
  });
}

export const facultyApi = {
  getAssignments,
  getStudents,
  addStudentToAssignment,
  addStudentsBulk,
  updateInitialAnalysis,
  updateSessional1,
  updateSessional2,
};
