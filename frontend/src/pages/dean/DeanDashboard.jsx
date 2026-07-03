import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { deanApi } from '../../api/deanApi';
import { masterApi } from '../../api/masterApi';
import '../../styles/Dashboard.css';

export function DeanDashboard() {
  const { user, scopes, logout } = useAuth();
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMasterData();
    loadSchools();
  }, []);

  useEffect(() => {
    if (selectedSchool) {
      loadDepartments();
    }
  }, [selectedSchool]);

  useEffect(() => {
    if (selectedDepartment && selectedYear && selectedSemester && selectedBatch) {
      loadAnalytics();
    }
  }, [selectedDepartment, selectedYear, selectedSemester, selectedBatch]);

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

  function loadSchools() {
    if (scopes?.dean && scopes.dean.length > 0) {
      const schoolList = scopes.dean.map(assignment => ({
        school_id: assignment.school_id,
        school_name: assignment.schools?.school_name || 'Unknown',
        school_code: assignment.schools?.school_code || ''
      }));
      setSchools(schoolList);
      if (schoolList.length === 1) {
        setSelectedSchool(schoolList[0].school_id);
      }
    }
  }

  async function loadDepartments() {
    setLoading(true);
    setError('');
    try {
      const data = await deanApi.getDepartments(selectedSchool);
      setDepartments(data.departments || []);
      setSelectedDepartment('');
      setAnalytics([]);
    } catch (err) {
      setError(err.message);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics() {
    setLoading(true);
    setError('');
    try {
      const data = await deanApi.getAnalytics(
        selectedDepartment,
        selectedBatch,
        selectedYear,
        selectedSemester
      );
      setAnalytics(data.analytics || []);
    } catch (err) {
      setError(err.message);
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  }

  function groupAnalyticsByFaculty(analyticsData) {
    const grouped = {};
    analyticsData.forEach(item => {
      const key = item.faculty?.employee_no;
      if (!grouped[key]) {
        grouped[key] = {
          faculty: item.faculty,
          courses: []
        };
      }
      grouped[key].courses.push(item);
    });
    return Object.values(grouped);
  }

  const groupedAnalytics = analytics.length > 0 ? groupAnalyticsByFaculty(analytics) : [];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>Dean Dashboard</h1>
          <p className="user-info">{user?.full_name} ({user?.employee_no})</p>
        </div>
        <button onClick={logout} className="btn-logout">Logout</button>
      </header>

      <div className="dashboard-content">
        <div className="filters-section">
          <div className="filter-group">
            <label>School</label>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              disabled={schools.length === 1}
            >
              <option value="">Select School</option>
              {schools.map((school) => (
                <option key={school.school_id} value={school.school_id}>
                  {school.school_code} - {school.school_name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              disabled={!selectedSchool}
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
            <label>Batch</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              disabled={!selectedDepartment}
            >
              <option value="">Select Batch</option>
              {batches.map((batch) => (
                <option key={batch.batch_id} value={batch.batch_id}>
                  {batch.batch_name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Academic Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={!selectedBatch}
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
        </div>

        {error && <div className="error-message">{error}</div>}
        {loading && <div className="loading">Loading...</div>}

        {groupedAnalytics.length > 0 && (
          <div className="analytics-section">
            <h3>Department Analytics - Faculty Performance</h3>
            {groupedAnalytics.map((group) => (
              <div key={group.faculty.employee_no} className="faculty-group">
                <h4>
                  {group.faculty.name} ({group.faculty.employee_no})
                </h4>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Section</th>
                        <th>P1</th>
                        <th>P2</th>
                        <th>TEC</th>
                        <th>Effectiveness</th>
                        <th>Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.courses.map((item) => (
                        <tr key={item.assignment_id}>
                          <td>
                            {item.course?.course_code} - {item.course?.course_name}
                          </td>
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
            ))}
          </div>
        )}

        {analytics.length === 0 && !loading && !error && selectedSemester && (
          <div className="info-box">
            No analytics data available for the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}
