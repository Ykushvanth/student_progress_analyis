import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { iqacApi } from '../../api/iqacApi';
import { masterApi } from '../../api/masterApi';
import { IqacManagement } from './IqacManagement';
import '../../styles/Dashboard.css';

export function IqacDashboard() {
  const { user, logout } = useAuth();
  const [schools, setSchools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filters, setFilters] = useState({
    school_id: '',
    department_id: '',
    batch_id: '',
    academic_year_id: '',
    semester_id: '',
    course_id: ''
  });
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasLoadedAnalytics, setHasLoadedAnalytics] = useState(false);
  const [activeTab, setActiveTab] = useState('analytics');
  const [workflowMessage, setWorkflowMessage] = useState('');
  const [workflowStages, setWorkflowStages] = useState([]);

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    if (filters.school_id) {
      loadDepartments();
    } else {
      setDepartments([]);
      setCourses([]);
    }
  }, [filters.school_id]);

  useEffect(() => {
    if (filters.department_id) {
      loadCourses();
    } else {
      setCourses([]);
    }
  }, [filters.department_id]);

  useEffect(() => {
    if (activeTab === 'workflow') {
      loadWorkflowStages();
    }
  }, [activeTab]);

  async function loadMasterData() {
    try {
      const [schoolsData, yearsData, semestersData, batchesData] = await Promise.all([
        iqacApi.getSchools(),
        masterApi.getAcademicYears(),
        masterApi.getSemesters(),
        masterApi.getBatches()
      ]);
      setSchools(schoolsData.schools || []);
      setAcademicYears(yearsData.academic_years || []);
      setSemesters(semestersData.semesters || []);
      setBatches(batchesData.batches || []);
    } catch (err) {
      setError('Failed to load master data');
    }
  }

  async function loadDepartments() {
    try {
      const data = await iqacApi.getDepartments(filters.school_id);
      setDepartments(data.departments || []);
    } catch (err) {
      setError('Failed to load departments');
    }
  }

  async function loadCourses() {
    try {
      const data = await iqacApi.getCourses(filters.department_id);
      setCourses(data.courses || []);
    } catch (err) {
      setError('Failed to load courses');
    }
  }

  async function loadWorkflowStages() {
    try {
      const data = await iqacApi.getWorkflowStages();
      setWorkflowStages(data.stages || []);
    } catch (err) {
      setError('Failed to load workflow stages');
    }
  }

  async function loadAnalytics() {
    setLoading(true);
    setError('');
    setHasLoadedAnalytics(false);
    try {
      const data = await iqacApi.getAnalytics(filters);
      setAnalytics(data.analytics || []);
      setHasLoadedAnalytics(true);
    } catch (err) {
      setError(err.message);
      setAnalytics([]);
      setHasLoadedAnalytics(true);
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(key, value) {
    setFilters(prev => {
      const updated = { ...prev, [key]: value };

      // Cascading resets: when parent filter changes, clear dependent children
      if (key === 'school_id') {
        updated.department_id = '';
        updated.course_id = '';
      }
      if (key === 'department_id') {
        updated.course_id = '';
      }

      return updated;
    });
  }

  async function handleWorkflowAction(stageId, action) {
    setWorkflowMessage('');
    try {
      if (action === 'open') {
        await iqacApi.openWorkflowStage(stageId);
        setWorkflowMessage(`Stage opened successfully`);
      } else {
        await iqacApi.closeWorkflowStage(stageId);
        setWorkflowMessage(`Stage closed successfully`);
      }
      loadWorkflowStages();
    } catch (err) {
      setWorkflowMessage(`Error: ${err.message}`);
    }
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>IQAC Dashboard</h1>
          <p className="user-info">{user?.full_name} ({user?.employee_no})</p>
        </div>
        <button onClick={logout} className="btn-logout">Logout</button>
      </header>

      <div className="dashboard-content">
        <div className="tabs">
          <button
            className={activeTab === 'analytics' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('analytics')}
          >
            System Analytics
          </button>
          <button
            className={activeTab === 'workflow' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('workflow')}
          >
            Workflow Management
          </button>
          <button
            className={activeTab === 'management' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('management')}
          >
            Data Management
          </button>
        </div>

        {activeTab === 'management' && (
          <IqacManagement />
        )}

        {activeTab === 'workflow' && (
          <div className="workflow-section">
            <h3>Workflow Stage Controls</h3>
            <p className="info-text">Open or close workflow stages to control when faculty can enter data</p>

            {workflowMessage && (
              <div className={workflowMessage.startsWith('Error') ? 'error-message' : 'success-message'}>
                {workflowMessage}
              </div>
            )}

            <div className="workflow-stages">
              {workflowStages.map((stage) => (
                <div key={stage.stage_id} className="stage-card">
                  <h4>{stage.stage_name}</h4>
                  <div className={`stage-status ${stage.is_open ? 'status-open' : 'status-closed'}`}>
                    Status: {stage.is_open ? 'OPEN' : 'CLOSED'}
                  </div>
                  <div className="stage-actions">
                    <button
                      className="btn-success"
                      onClick={() => handleWorkflowAction(stage.stage_id, 'open')}
                      disabled={stage.is_open}
                    >
                      Open Stage
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleWorkflowAction(stage.stage_id, 'close')}
                      disabled={!stage.is_open}
                    >
                      Close Stage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <>
            <div className="filters-section">
              <div className="filter-group">
                <label>School</label>
                <select value={filters.school_id} onChange={(e) => updateFilter('school_id', e.target.value)}>
                  <option value="">All Schools</option>
                  {schools.map((s) => (
                    <option key={s.school_id} value={s.school_id}>{s.school_name}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Department</label>
                <select value={filters.department_id} onChange={(e) => updateFilter('department_id', e.target.value)}>
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Batch</label>
                <select value={filters.batch_id} onChange={(e) => updateFilter('batch_id', e.target.value)}>
                  <option value="">All Batches</option>
                  {batches.map((b) => (
                    <option key={b.batch_id} value={b.batch_id}>{b.batch_name}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Academic Year</label>
                <select value={filters.academic_year_id} onChange={(e) => updateFilter('academic_year_id', e.target.value)}>
                  <option value="">All Years</option>
                  {academicYears.map((y) => (
                    <option key={y.academic_year_id} value={y.academic_year_id}>{y.academic_year}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Semester</label>
                <select value={filters.semester_id} onChange={(e) => updateFilter('semester_id', e.target.value)}>
                  <option value="">All Semesters</option>
                  {semesters.map((s) => (
                    <option key={s.semester_id} value={s.semester_id}>{s.semester_name}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Course</label>
                <select value={filters.course_id} onChange={(e) => updateFilter('course_id', e.target.value)}>
                  <option value="">All Courses</option>
                  {courses.map((c) => (
                    <option key={c.course_id} value={c.course_id}>{c.course_code} - {c.course_name}</option>
                  ))}
                </select>
              </div>

              <div className="filter-actions">
                <button className="btn-primary" onClick={loadAnalytics}>
                  Load Analytics
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {loading && <div className="loading">Loading...</div>}

            {!loading && !error && hasLoadedAnalytics && analytics.length === 0 && (
              <div className="info-message">
                No analytics data found for the selected filters. Try adjusting your filter criteria.
              </div>
            )}

            {analytics.length > 0 && (
              <div className="analytics-section">
                <h3>System-Wide Faculty Effectiveness</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>School</th>
                        <th>Department</th>
                        <th>Course</th>
                        <th>Faculty</th>
                        <th>Batch</th>
                        <th>Section</th>
                        <th>Year</th>
                        <th>Semester</th>
                        <th>P1</th>
                        <th>P2</th>
                        <th>TEC</th>
                        <th>Effectiveness</th>
                        <th>Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.map((item) => (
                        <tr key={item.assignment_id}>
                          <td>{item.school || 'N/A'}</td>
                          <td>{item.department || 'N/A'}</td>
                          <td>{item.course?.code} - {item.course?.name}</td>
                          <td>{item.faculty?.name}</td>
                          <td>{item.batch}</td>
                          <td>{item.section}</td>
                          <td>{item.academic_year}</td>
                          <td>{item.semester}</td>
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
      </div>
    </div>
  );
}
