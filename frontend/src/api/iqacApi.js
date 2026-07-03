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
  return makeRequest('/iqac/schools', {
    method: 'GET',
  });
}

export async function getDepartments(schoolId) {
  const params = schoolId ? `?school_id=${schoolId}` : '';
  return makeRequest(`/iqac/departments${params}`, {
    method: 'GET',
  });
}

export async function getCourses(departmentId) {
  const params = departmentId ? `?department_id=${departmentId}` : '';
  return makeRequest(`/iqac/courses${params}`, {
    method: 'GET',
  });
}

export async function getWorkflowStages() {
  return makeRequest('/iqac/workflow-stages', {
    method: 'GET',
  });
}

export async function getAnalytics(filters = {}) {
  const params = new URLSearchParams();
  if (filters.school_id) params.append('school_id', filters.school_id);
  if (filters.department_id) params.append('department_id', filters.department_id);
  if (filters.batch_id) params.append('batch_id', filters.batch_id);
  if (filters.academic_year_id) params.append('academic_year_id', filters.academic_year_id);
  if (filters.semester_id) params.append('semester_id', filters.semester_id);
  if (filters.course_id) params.append('course_id', filters.course_id);

  return makeRequest(`/iqac/analytics?${params.toString()}`, {
    method: 'GET',
  });
}

export async function openWorkflowStage(stageId) {
  return makeRequest(`/iqac/workflow-stage/${stageId}/open`, {
    method: 'POST',
  });
}

export async function closeWorkflowStage(stageId) {
  return makeRequest(`/iqac/workflow-stage/${stageId}/close`, {
    method: 'POST',
  });
}

// ============================================================================
// ADMIN API - Faculty Management
// ============================================================================

export async function getFaculty(departmentId) {
  const params = departmentId ? `?department_id=${departmentId}` : '';
  return makeRequest(`/iqac/admin/faculty${params}`, { method: 'GET' });
}

export async function createFaculty(facultyData) {
  return makeRequest('/iqac/admin/faculty', {
    method: 'POST',
    body: JSON.stringify(facultyData),
  });
}

export async function updateFaculty(userId, updates) {
  return makeRequest(`/iqac/admin/faculty/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function createFacultyDepartmentAssignment(assignmentData) {
  return makeRequest('/iqac/admin/faculty-department-assignments', {
    method: 'POST',
    body: JSON.stringify(assignmentData),
  });
}

// ============================================================================
// ADMIN API - Faculty Course Assignments
// ============================================================================

export async function getFacultyAssignments(filters = {}) {
  const params = new URLSearchParams();
  if (filters.faculty_id) params.append('faculty_id', filters.faculty_id);
  if (filters.course_id) params.append('course_id', filters.course_id);
  if (filters.academic_year_id) params.append('academic_year_id', filters.academic_year_id);
  if (filters.semester_id) params.append('semester_id', filters.semester_id);
  if (filters.department_id) params.append('department_id', filters.department_id);

  return makeRequest(`/iqac/admin/faculty-assignments?${params.toString()}`, {
    method: 'GET',
  });
}

export async function createFacultyAssignment(assignmentData) {
  return makeRequest('/iqac/admin/faculty-assignments', {
    method: 'POST',
    body: JSON.stringify(assignmentData),
  });
}

export async function deleteFacultyAssignment(assignmentId) {
  return makeRequest(`/iqac/admin/faculty-assignments/${assignmentId}`, {
    method: 'DELETE',
  });
}

export async function createCourseSectionAssignments(assignmentData) {
  return makeRequest('/iqac/admin/course-section-assignments', {
    method: 'POST',
    body: JSON.stringify(assignmentData),
  });
}

// ============================================================================
// ADMIN API - Students
// ============================================================================

export async function getStudents(filters = {}) {
  const params = new URLSearchParams();
  if (filters.department_id) params.append('department_id', filters.department_id);
  if (filters.batch_id) params.append('batch_id', filters.batch_id);
  if (filters.section_id) params.append('section_id', filters.section_id);

  return makeRequest(`/iqac/admin/students?${params.toString()}`, {
    method: 'GET',
  });
}

export async function createStudent(studentData) {
  return makeRequest('/iqac/admin/students', {
    method: 'POST',
    body: JSON.stringify(studentData),
  });
}

export async function updateStudent(studentId, updates) {
  return makeRequest(`/iqac/admin/students/${studentId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// ============================================================================
// ADMIN API - Enrollments
// ============================================================================

export async function getEnrollments(filters = {}) {
  const params = new URLSearchParams();
  if (filters.assignment_id) params.append('assignment_id', filters.assignment_id);
  if (filters.student_id) params.append('student_id', filters.student_id);

  return makeRequest(`/iqac/admin/enrollments?${params.toString()}`, {
    method: 'GET',
  });
}

export async function createEnrollment(enrollmentData) {
  return makeRequest('/iqac/admin/enrollments', {
    method: 'POST',
    body: JSON.stringify(enrollmentData),
  });
}

export async function deleteEnrollment(enrollmentId) {
  return makeRequest(`/iqac/admin/enrollments/${enrollmentId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// ADMIN API - Master Data
// ============================================================================

export async function createSchool(schoolData) {
  return makeRequest('/iqac/admin/schools', {
    method: 'POST',
    body: JSON.stringify(schoolData),
  });
}

export async function createDepartment(departmentData) {
  return makeRequest('/iqac/admin/departments', {
    method: 'POST',
    body: JSON.stringify(departmentData),
  });
}

export async function createCourse(courseData) {
  return makeRequest('/iqac/admin/courses', {
    method: 'POST',
    body: JSON.stringify(courseData),
  });
}

export async function updateCourse(courseId, updates) {
  return makeRequest(`/iqac/admin/courses/${courseId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function createAcademicYear(yearData) {
  return makeRequest('/iqac/admin/academic-years', {
    method: 'POST',
    body: JSON.stringify(yearData),
  });
}

export async function createBatch(batchData) {
  return makeRequest('/iqac/admin/batches', {
    method: 'POST',
    body: JSON.stringify(batchData),
  });
}

export const iqacApi = {
  getSchools,
  getDepartments,
  getCourses,
  getAnalytics,
  getWorkflowStages,
  openWorkflowStage,
  closeWorkflowStage,
  // Admin functions
  getFaculty,
  createFaculty,
  updateFaculty,
  createFacultyDepartmentAssignment,
  getFacultyAssignments,
  createFacultyAssignment,
  deleteFacultyAssignment,
  createCourseSectionAssignments,
  getStudents,
  createStudent,
  updateStudent,
  getEnrollments,
  createEnrollment,
  deleteEnrollment,
  createSchool,
  createDepartment,
  createCourse,
  updateCourse,
  createAcademicYear,
  createBatch,
};
