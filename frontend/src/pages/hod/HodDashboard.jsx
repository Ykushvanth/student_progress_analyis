import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { hodApi } from '../../api/hodApi';
import { masterApi } from '../../api/masterApi';
import '../../styles/Dashboard.css';

export function HodDashboard() {
  const { user, scopes, logout } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('courses');

  useEffect(() => {
    loadMasterData();
    loadDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartment && selectedYear && selectedSemester && selectedBatch) {
      loadCourses();
    }
  }, [selectedDepartment, selectedYear, selectedSemester, selectedBatch]);

  useEffect(() => {
    if (selectedDepartment && activeTab === 'faculty') {
      loadFaculty();
    }
  }, [selectedDepartment, activeTab]);

  useEffect(() => {
    if (selectedCourse) {
      loadAnalytics();
    }
  }, [selectedCourse]);

  async function loadMasterData() {
    try {
      const [yearsData, semestersData, batchesData] = await Promise.all([
        masterApi.getAcademicYears(),
        masterApi.getSemesters(),
        masterApi.getBatches()
      ]);
      setAcademicYears(yearsData.academic_years || []);
      setSemesters(semestersData.semesters || []);
      setBatches(batchesData.batches || []);
    } catch (err) {
      setError('Failed to load master data');
    }
  }

  function loadDepartments() {
    if (scopes?.hod && scopes.hod.length > 0) {
      const deptList = scopes.hod.map(assignment => ({
        department_id: assignment.department_id,
        department_name: assignment.departments?.department_name || 'Unknown',
        department_code: assignment.departments?.department_code || ''
      }));
      setDepartments(deptList);
      if (deptList.length === 1) {
        setSelectedDepartment(deptList[0].department_id);
      }
    }
  }

  async function loadCourses() {
    setLoading(true);
    setError('');
    try {
      const data = await hodApi.getCourses(
        selectedDepartment,
        selectedYear,
        selectedSemester,
        selectedBatch
      );
      setCourses(data.courses || []);
      setSelectedCourse(null);
      setAnalytics([]);
    } catch (err) {
      setError(err.message);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadFaculty() {
    setLoading(true);
    setError('');
    try {
      const data = await hodApi.getDepartmentFaculty(selectedDepartment);
      setFaculty(data.faculty || []);
    } catch (err) {
      setError(err.message);
      setFaculty([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics() {
    if (!selectedCourse?.course_id) return;
    setLoading(true);
    setError('');
    try {
      const data = await hodApi.getAnalytics(selectedCourse.course_id);
      setAnalytics(data.analytics || []);
    } catch (err) {
      setError(err.message);
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>HOD Dashboard</h1>
          <p className="user-info">{user?.full_name} ({user?.employee_no})</p>
        </div>
        <button onClick={logout} className="btn-logout">Logout</button>
      </header>

      <div className="dashboard-content">
        <div className="tabs">
          <button
            className={activeTab === 'courses' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('courses')}
          >
            Course Analytics
          </button>
          <button
            className={activeTab === 'faculty' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('faculty')}
          >
            Department Faculty
          </button>
        </div>

        {activeTab === 'courses' && (
          <>
            <div className="filters-section">
              <div className="filter-group">
                <label>Department</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  disabled={departments.length === 1}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.department_id} value={dept.department_id}>
                      {dept.department_code} - {dept.department_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Academic Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  disabled={!selectedDepartment}
                >
                  <option value="">Select Year</option>
                  {academicYears.map((year) => (
                    <option key={year.academic_year_id} value={year.academic_year_id}>
                      {year.academic_year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Semester</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  disabled={!selectedYear}
                >
                  <option value="">Select Semester</option>
                  {semesters.map((sem) => (
                    <option key={sem.semester_id} value={sem.semester_id}>
                      {sem.semester_name} ({sem.semester_type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Batch</label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  disabled={!selectedSemester}
                >
                  <option value="">Select Batch</option>
                  {batches.map((batch) => (
                    <option key={batch.batch_id} value={batch.batch_id}>
                      {batch.batch_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {loading && <div className="loading">Loading...</div>}

            {courses.length > 0 && (
              <div className="courses-section">
                <h3>Courses in Department</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Course Code</th>
                        <th>Course Name</th>
                        <th>Faculty</th>
                        <th>Section</th>
                        <th>Batch</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((course) => (
                        <tr key={course.assignment_id}>
                          <td>{course.courses?.course_code}</td>
                          <td>{course.courses?.course_name}</td>
                          <td>{course.users?.full_name}</td>
                          <td>{course.sections?.section_name}</td>
                          <td>{course.academic_batches?.batch_name}</td>
                          <td>
                            <button
                              className="btn-small"
                              onClick={() => setSelectedCourse(course)}
                            >
                              View Analytics
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedCourse && analytics.length > 0 && (
              <div className="analytics-section">
                <h3>
                  Effectiveness for {selectedCourse.courses?.course_code} - {selectedCourse.courses?.course_name}
                </h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Faculty</th>
                        <th>Section</th>
                        <th>P1 Score</th>
                        <th>P2 Score</th>
                        <th>TEC Score</th>
                        <th>Effectiveness</th>
                        <th>Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.map((item) => (
                        <tr key={item.assignment_id}>
                          <td>{item.faculty?.name}</td>
                          <td>{item.section}</td>
                          <td>{item.effectiveness?.p1?.toFixed(2) || 'N/A'}</td>
                          <td>{item.effectiveness?.p2?.toFixed(2) || 'N/A'}</td>
                          <td>{item.effectiveness?.tec?.toFixed(2) || 'N/A'}</td>
                          <td>{item.effectiveness?.effectiveness_score?.toFixed(2) || 'N/A'}</td>
                          <td>
                            <span className={`badge badge-${item.effectiveness?.rating?.toLowerCase().replace(' ', '-')}`}>
                              {item.effectiveness?.rating || 'Not Calculated'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'faculty' && (
          <div className="faculty-section">
            <div className="filter-group">
              <label>Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                disabled={departments.length === 1}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.department_code} - {dept.department_name}
                  </option>
                ))}
              </select>
            </div>

            {error && <div className="error-message">{error}</div>}
            {loading && <div className="loading">Loading...</div>}

            {faculty.length > 0 && (
              <>
                <h3>Faculty Members</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee No</th>
                        <th>Name</th>
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faculty.map((f) => (
                        <tr key={f.user_id}>
                          <td>{f.employee_no}</td>
                          <td>{f.full_name}</td>
                          <td>{f.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
