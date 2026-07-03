import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { facultyApi } from '../../api/facultyApi';
import { masterApi } from '../../api/masterApi';
import { BulkAddStudents } from '../../components/BulkAddStudents';
import '../../styles/FacultyDashboard.css';

export function FacultyDashboard() {
  const { user, logout } = useAuth();
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentForm, setStudentForm] = useState({
    register_no: '',
    student_name: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    if (selectedYear && selectedSemester) {
      loadAssignments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedSemester]);

  useEffect(() => {
    if (selectedAssignment) {
      setError('');
      setSuccessMessage('');
      setStudentForm({ register_no: '', student_name: '', email: '' });
      loadStudents();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignment]);

  async function loadMasterData() {
    try {
      const [yearsData, semestersData] = await Promise.all([
        masterApi.getAcademicYears(),
        masterApi.getSemesters()
      ]);
      setAcademicYears(yearsData.academic_years || []);
      setSemesters(semestersData.semesters || []);
    } catch (err) {
      setError('Failed to load master data');
    }
  }

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await facultyApi.getAssignments(selectedYear, selectedSemester);
      setAssignments(data.assignments || []);
      setSelectedAssignment(null);
      setStudents([]);
    } catch (err) {
      setError(err.message);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedSemester]);

  const loadStudents = useCallback(async () => {
    if (!selectedAssignment) return;
    setLoading(true);
    setError('');
    try {
      const data = await facultyApi.getStudents(selectedAssignment.assignment_id);
      setStudents(data.students || []);
    } catch (err) {
      setError(err.message);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedAssignment]);

  async function handleAddStudent(e) {
    e.preventDefault();
    if (!selectedAssignment) return;

    setAddingStudent(true);
    setError('');
    setSuccessMessage('');

    try {
      await facultyApi.addStudentToAssignment(selectedAssignment.assignment_id, studentForm);
      setStudentForm({
        register_no: '',
        student_name: '',
        email: ''
      });
      setSuccessMessage('Student added to this section successfully');
      await loadStudents();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingStudent(false);
    }
  }

  async function handleUpdateInitialAnalysis(enrollmentId, value) {
    try {
      await facultyApi.updateInitialAnalysis(enrollmentId, value);
      loadStudents();
    } catch (err) {
      alert(`Failed to update: ${err.message}`);
    }
  }

  async function handleUpdateSessional1(enrollmentId, value) {
    try {
      await facultyApi.updateSessional1(enrollmentId, parseFloat(value));
      loadStudents();
    } catch (err) {
      alert(`Failed to update: ${err.message}`);
    }
  }

  async function handleUpdateSessional2(enrollmentId, value) {
    try {
      await facultyApi.updateSessional2(enrollmentId, parseFloat(value));
      loadStudents();
    } catch (err) {
      alert(`Failed to update: ${err.message}`);
    }
  }

  return (
    <div className="faculty-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Faculty Dashboard</h1>
          <p className="user-name">{user?.full_name} ({user?.employee_no})</p>
        </div>
        <button onClick={logout} className="logout-btn">Logout</button>
      </header>

      <div className="dashboard-content">
        <div className="faculty-dashboard-grid">
          <div className="filters-section">
            <h2>Select Course Assignment</h2>

            <div className="filters-row">
              <div className="filter-group">
                <label>Academic Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map(y => (
                    <option key={y.academic_year_id} value={y.academic_year_id}>
                      {y.academic_year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Semester</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                >
                  <option value="">Select Semester</option>
                  {semesters.map(s => (
                    <option key={s.semester_id} value={s.semester_id}>
                      {s.semester_name} ({s.semester_type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {assignments.length > 0 && (
            <div className="courses-container">
              <div className="courses-section-header">
                <h3>Your Courses</h3>
                <p>Select a course to view and manage students</p>
              </div>
              <div className="assignments-grid">
                {assignments.map(assignment => (
                  <div
                    key={assignment.assignment_id}
                    className={`assignment-card ${selectedAssignment?.assignment_id === assignment.assignment_id ? 'selected' : ''}`}
                    onClick={() => setSelectedAssignment(assignment)}
                  >
                    <div className="card-header">
                      <span className="course-code-badge">{assignment.courses.course_code}</span>
                    </div>
                    <div className="card-body">
                      <h3 className="course-title">{assignment.courses.course_name}</h3>
                    </div>
                    <div className="card-footer">
                      <span className="info-badge">
                        <span className="badge-icon">📚</span>
                        {assignment.academic_batches.batch_name}
                      </span>
                      <span className="info-badge">
                        <span className="badge-icon">👥</span>
                        Section {assignment.sections.section_name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
        {loading && <div className="loading">Loading...</div>}

        {selectedAssignment && (
          <div className="students-section">
            <div className="students-section-header">
              <div>
                <h2>Students - {selectedAssignment.courses.course_name}</h2>
                <p>
                  {selectedAssignment.academic_batches.batch_name} - Section {selectedAssignment.sections.section_name}
                </p>
              </div>
              <button
                onClick={() => setShowBulkAdd(!showBulkAdd)}
                className="primary-btn"
                type="button"
              >
                {showBulkAdd ? 'Hide Bulk Add' : 'Bulk Add Students'}
              </button>
            </div>

            {showBulkAdd && (
              <BulkAddStudents
                assignmentId={selectedAssignment.assignment_id}
                onSuccess={() => {
                  setShowBulkAdd(false);
                  loadStudents();
                }}
              />
            )}

            <form className="add-student-form" onSubmit={handleAddStudent}>
              <h3>Add Section Student</h3>
              <p className="form-help">
                Student will be added only to this selected course, batch, and section.
              </p>
              <div className="add-student-grid">
                <div className="filter-group">
                  <label>Register No *</label>
                  <input
                    type="text"
                    value={studentForm.register_no}
                    onChange={(e) => setStudentForm({ ...studentForm, register_no: e.target.value })}
                    placeholder="e.g., 23CSE001"
                    required
                  />
                </div>
                <div className="filter-group">
                  <label>Student Name *</label>
                  <input
                    type="text"
                    value={studentForm.student_name}
                    onChange={(e) => setStudentForm({ ...studentForm, student_name: e.target.value })}
                    placeholder="Student name"
                    required
                  />
                </div>
                <div className="filter-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                    placeholder="student@example.com"
                  />
                </div>
              </div>
              <button type="submit" className="primary-btn" disabled={addingStudent}>
                {addingStudent ? 'Adding...' : 'Add Student'}
              </button>
            </form>

            {students.length === 0 && !loading && (
              <div className="empty-state">
                No students enrolled yet. Add section students using the form above.
              </div>
            )}

            {students.length > 0 && (
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Register No</th>
                    <th>Name</th>
                    <th>Initial Analysis</th>
                    <th>Sessional 1</th>
                    <th>Sessional 2</th>
                    <th>P1 Score</th>
                    <th>P2 Score</th>
                    <th>Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.enrollment_id}>
                      <td>{student.register_no}</td>
                      <td>{student.student_name}</td>
                      <td>
                        <select
                          value={student.performance?.initial_analysis || ''}
                          onChange={(e) => handleUpdateInitialAnalysis(student.enrollment_id, e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="Slow Learner">Slow Learner</option>
                          <option value="Medium Learner">Medium Learner</option>
                          <option value="Fast Learner">Fast Learner</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={student.performance?.sessional1_marks || ''}
                          onChange={(e) => handleUpdateSessional1(student.enrollment_id, e.target.value)}
                          disabled={!student.performance?.initial_analysis}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={student.performance?.sessional2_marks || ''}
                          onChange={(e) => handleUpdateSessional2(student.enrollment_id, e.target.value)}
                          disabled={!student.performance?.sessional1_marks}
                        />
                      </td>
                      <td>{student.performance?.p1_score?.toFixed(2) || '-'}</td>
                      <td>{student.performance?.p2_score?.toFixed(2) || '-'}</td>
                      <td>{student.performance?.overall_score?.toFixed(2) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
