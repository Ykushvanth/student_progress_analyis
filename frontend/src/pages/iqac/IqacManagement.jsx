import React, { useState, useEffect } from 'react';
import { iqacApi } from '../../api/iqacApi';
import { masterApi } from '../../api/masterApi';
import '../../styles/IqacManagement.css';

export function IqacManagement() {
  const [activeSection, setActiveSection] = useState('assignments');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Filter state
  const [filters, setFilters] = useState({
    school_id: '',
    department_id: '',
    academic_year_id: '',
    batch_id: '',
    semester_id: ''
  });

  // Master data
  const [schools, setSchools] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);

  // Faculty assignments
  const [assignments, setAssignments] = useState([]);
  const [assignmentForm, setAssignmentForm] = useState({
    faculty_id: '',
    course_id: '',
    batch_id: '',
    section_id: '',
    academic_year_id: '',
    semester_id: ''
  });

  // Academic year setup
  const [setupForm, setSetupForm] = useState({
    academic_year_id: '',
    new_academic_year: '',
    school_id: '',
    department_id: '',
    batch_id: '',
    semester_id: '',
    course_id: ''
  });
  const [setupFacultyId, setSetupFacultyId] = useState('');
  const [sectionAssignments, setSectionAssignments] = useState({});

  // Course management
  const [courseForm, setCourseForm] = useState({
    course_code: '',
    course_name: '',
    department_id: '',
    year_of_study: '',
    credits: ''
  });
  const [editingCourse, setEditingCourse] = useState(null);
  const [facultySearch, setFacultySearch] = useState('');

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    if (activeSection === 'assignments') {
      loadAssignments();
    }
  }, [activeSection]);

  // Cascading filters: When school changes, load departments
  useEffect(() => {
    if (filters.school_id) {
      loadDepartmentsForSchool(filters.school_id);
    } else {
      setDepartments([]);
    }
  }, [filters.school_id]);

  // When department changes, load faculty
  useEffect(() => {
    if (filters.department_id) {
      loadFacultyForDepartment(filters.department_id);
    } else {
      setFaculty([]);
    }
  }, [filters.department_id]);

  // When filters change, reload assignments
  useEffect(() => {
    if (activeSection === 'assignments') {
      loadAssignments();
    }
  }, [filters]);

  // Sync filters to assignment form (pre-fill)
  useEffect(() => {
    setAssignmentForm(prev => ({
      ...prev,
      batch_id: filters.batch_id || prev.batch_id,
      academic_year_id: filters.academic_year_id || prev.academic_year_id,
      semester_id: filters.semester_id || prev.semester_id
    }));
  }, [filters.batch_id, filters.academic_year_id, filters.semester_id]);

  async function loadMasterData() {
    try {
      const [
        schoolsData,
        facultyData,
        coursesData,
        batchesData,
        sectionsData,
        yearsData,
        semestersData,
        deptsData
      ] = await Promise.all([
        iqacApi.getSchools(),
        iqacApi.getFaculty(),
        masterApi.getCourses(),
        masterApi.getBatches(),
        masterApi.getSections(),
        masterApi.getAcademicYears(),
        masterApi.getSemesters(),
        masterApi.getDepartments()
      ]);

      setSchools(schoolsData.schools || []);
      setFaculty(facultyData.faculty || []);
      setCourses(coursesData.courses || []);
      setBatches(batchesData.batches || []);
      setSections(sectionsData.sections || []);
      setAcademicYears(yearsData.academic_years || []);
      setSemesters(semestersData.semesters || []);
      setAllDepartments(deptsData.departments || []);
    } catch (error) {
      showMessage('error', 'Failed to load master data: ' + error.message);
    }
  }

  async function loadDepartmentsForSchool(schoolId) {
    try {
      const filtered = allDepartments.filter(d => d.school_id === parseInt(schoolId));
      setDepartments(filtered);
    } catch (error) {
      showMessage('error', 'Failed to load departments: ' + error.message);
    }
  }

  async function loadFacultyForDepartment(departmentId) {
    try {
      const data = await iqacApi.getFaculty(departmentId);
      setFaculty(data.faculty || []);
    } catch (error) {
      showMessage('error', 'Failed to load faculty: ' + error.message);
    }
  }

  async function loadAssignments() {
    setLoading(true);
    try {
      const data = await iqacApi.getFacultyAssignments(filters);
      setAssignments(data.assignments || []);
    } catch (error) {
      showMessage('error', 'Failed to load assignments: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(key, value) {
    setFilters(prev => {
      const updated = { ...prev, [key]: value };

      // Cascading resets
      if (key === 'school_id') {
        updated.department_id = '';
      }

      return updated;
    });
  }

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }

  function getSelectedFacultyDepartmentId() {
    const selectedFaculty = faculty.find(f => Number(f.user_id) === Number(assignmentForm.faculty_id));
    if (!selectedFaculty) return null;

    const activeAssignments = selectedFaculty.faculty_department_assignment?.filter(fda => fda.active) || [];
    const yearSpecificAssignment = activeAssignments.find(fda =>
      Number(fda.academic_year_id) === Number(assignmentForm.academic_year_id)
    );

    return yearSpecificAssignment?.department_id || activeAssignments[0]?.department_id || null;
  }

  const selectedFacultyDepartmentId = getSelectedFacultyDepartmentId();
  const availableCourses = selectedFacultyDepartmentId
    ? courses.filter(c => Number(c.department_id) === Number(selectedFacultyDepartmentId))
    : courses;

  const setupDepartments = setupForm.school_id
    ? allDepartments.filter(d => Number(d.school_id) === Number(setupForm.school_id))
    : [];
  const setupDerivedYearOfStudy = (() => {
    if (!setupForm.batch_id || !setupForm.academic_year_id) return null;

    const selectedBatch = batches.find(b => Number(b.batch_id) === Number(setupForm.batch_id));
    const selectedAcademicYear = academicYears.find(y => Number(y.academic_year_id) === Number(setupForm.academic_year_id));

    if (!selectedBatch || !selectedAcademicYear) return null;

    const batchStartYear = Number(selectedBatch.start_year);
    const academicYearStart = Number(String(selectedAcademicYear.academic_year).split('-')[0]);
    const yearOfStudy = academicYearStart - batchStartYear + 1;

    return yearOfStudy >= 1 && yearOfStudy <= 4 ? yearOfStudy : null;
  })();
  const setupHasYearInputs = Boolean(setupForm.batch_id && setupForm.academic_year_id);
  const setupHasInvalidYear = setupHasYearInputs && !setupDerivedYearOfStudy;
  const setupCourses = setupForm.department_id && setupDerivedYearOfStudy
    ? courses.filter(c =>
        Number(c.department_id) === Number(setupForm.department_id) &&
        Number(c.year_of_study) === Number(setupDerivedYearOfStudy)
      )
    : [];
  const setupFaculty = setupForm.department_id
    ? faculty.filter(f => f.faculty_department_assignment?.some(fda =>
        Number(fda.department_id) === Number(setupForm.department_id) && fda.active
      ))
    : faculty;
  const eligibleSetupFaculty = setupFaculty.filter(f =>
    f.faculty_department_assignment?.some(fda =>
      Number(fda.department_id) === Number(setupForm.department_id) &&
      Number(fda.academic_year_id) === Number(setupForm.academic_year_id) &&
      fda.active
    )
  );

  function updateSetupForm(key, value) {
    setSetupForm(prev => {
      const updated = { ...prev, [key]: value };

      if (key === 'school_id') {
        updated.department_id = '';
        updated.course_id = '';
      }
      if (key === 'department_id') {
        updated.course_id = '';
      }
      if (key === 'batch_id' || key === 'academic_year_id') {
        updated.course_id = '';
      }

      return updated;
    });
  }

  async function handleCreateSetupAcademicYear(e) {
    e.preventDefault();
    if (!setupForm.new_academic_year.trim()) return;

    setLoading(true);
    try {
      const data = await iqacApi.createAcademicYear({ academic_year: setupForm.new_academic_year.trim() });
      showMessage('success', 'Academic year created successfully');
      setAcademicYears(prev => [...prev, data.academic_year]);
      setSetupForm(prev => ({
        ...prev,
        academic_year_id: data.academic_year.academic_year_id,
        new_academic_year: ''
      }));
    } catch (error) {
      showMessage('error', 'Failed to create academic year: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignFacultyToDepartment() {
    if (!setupFacultyId || !setupForm.department_id || !setupForm.academic_year_id) {
      showMessage('error', 'Select academic year, department, and faculty first');
      return;
    }

    setLoading(true);
    try {
      await iqacApi.createFacultyDepartmentAssignment({
        user_id: setupFacultyId,
        department_id: setupForm.department_id,
        academic_year_id: setupForm.academic_year_id
      });
      showMessage('success', 'Faculty assigned to department for selected academic year');
      await loadMasterData();
    } catch (error) {
      showMessage('error', 'Failed to assign faculty to department: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function updateSectionAssignment(sectionId, facultyId) {
    setSectionAssignments(prev => ({
      ...prev,
      [sectionId]: facultyId
    }));
  }

  function assignFacultyToAllSections(facultyId) {
    if (!facultyId) return;
    const nextAssignments = {};
    sections.forEach(section => {
      nextAssignments[section.section_id] = facultyId;
    });
    setSectionAssignments(nextAssignments);
  }

  async function handleSaveSectionAssignments() {
    const selectedRows = Object.entries(sectionAssignments)
      .filter(([, facultyId]) => facultyId)
      .map(([sectionId, facultyId]) => ({
        section_id: sectionId,
        faculty_id: facultyId
      }));

    if (!setupForm.course_id || !setupForm.batch_id || !setupForm.academic_year_id || !setupForm.semester_id) {
      showMessage('error', 'Select academic year, batch, semester, and course before saving');
      return;
    }

    if (selectedRows.length === 0) {
      showMessage('error', 'Assign at least one section to a faculty member');
      return;
    }

    setLoading(true);
    try {
      const data = await iqacApi.createCourseSectionAssignments({
        course_id: setupForm.course_id,
        batch_id: setupForm.batch_id,
        academic_year_id: setupForm.academic_year_id,
        semester_id: setupForm.semester_id,
        section_assignments: selectedRows
      });
      showMessage('success', data.message || 'Section assignments saved successfully');
      setSectionAssignments({});
      loadAssignments();
    } catch (error) {
      showMessage('error', 'Failed to save section assignments: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAssignment(e) {
    e.preventDefault();

    const selectedFaculty = faculty.find(f => Number(f.user_id) === Number(assignmentForm.faculty_id));
    const matchingFacultyDepartment = selectedFaculty?.faculty_department_assignment?.find(fda =>
      fda.active &&
      Number(fda.academic_year_id) === Number(assignmentForm.academic_year_id) &&
      Number(fda.department_id) === Number(courses.find(c => Number(c.course_id) === Number(assignmentForm.course_id))?.department_id)
    );

    if (!matchingFacultyDepartment) {
      showMessage('error', 'Selected faculty is not assigned to this course department for the selected academic year. Choose a matching faculty, course, and academic year.');
      return;
    }

    setLoading(true);

    try {
      await iqacApi.createFacultyAssignment(assignmentForm);
      showMessage('success', 'Faculty course assignment created successfully');
      setAssignmentForm({
        faculty_id: '',
        course_id: '',
        batch_id: '',
        section_id: '',
        academic_year_id: '',
        semester_id: ''
      });
      loadAssignments();
    } catch (error) {
      showMessage('error', 'Failed to create assignment: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAssignment(assignmentId) {
    if (!window.confirm('Are you sure you want to delete this assignment?')) {
      return;
    }

    setLoading(true);
    try {
      await iqacApi.deleteFacultyAssignment(assignmentId);
      showMessage('success', 'Assignment deleted successfully');
      loadAssignments();
    } catch (error) {
      showMessage('error', 'Failed to delete assignment: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCourse(e) {
    e.preventDefault();
    setLoading(true);

    try {
      await iqacApi.createCourse({
        ...courseForm,
        year_of_study: parseInt(courseForm.year_of_study),
        credits: parseFloat(courseForm.credits)
      });
      showMessage('success', 'Course created successfully');
      setCourseForm({
        course_code: '',
        course_name: '',
        department_id: '',
        year_of_study: '',
        credits: ''
      });
      loadMasterData(); // Reload courses
    } catch (error) {
      showMessage('error', 'Failed to create course: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateCourse(e) {
    e.preventDefault();
    setLoading(true);

    try {
      await iqacApi.updateCourse(editingCourse.course_id, {
        course_name: courseForm.course_name,
        credits: parseFloat(courseForm.credits)
      });
      showMessage('success', 'Course updated successfully');
      handleCancelEditCourse();
      loadMasterData(); // Reload courses
    } catch (error) {
      showMessage('error', 'Failed to update course: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleEditCourse(course) {
    setEditingCourse(course);
    setCourseForm({
      course_code: course.course_code,
      course_name: course.course_name,
      department_id: course.department_id,
      year_of_study: course.year_of_study,
      credits: course.credits
    });
  }

  function handleCancelEditCourse() {
    setEditingCourse(null);
    setCourseForm({
      course_code: '',
      course_name: '',
      department_id: '',
      year_of_study: '',
      credits: ''
    });
  }

  return (
    <div className="iqac-management">
      <div className="management-tabs">
        <button
          className={activeSection === 'assignments' ? 'tab active' : 'tab'}
          onClick={() => setActiveSection('assignments')}
        >
          Faculty Course Assignments
        </button>
        <button
          className={activeSection === 'setup' ? 'tab active' : 'tab'}
          onClick={() => setActiveSection('setup')}
        >
          Academic Year Setup
        </button>
        <button
          className={activeSection === 'courses' ? 'tab active' : 'tab'}
          onClick={() => setActiveSection('courses')}
        >
          Course Management
        </button>
      </div>

      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      {activeSection === 'assignments' && (
        <div className="management-section">
          <div className="section-header">
            <h2>Manage Faculty Course Assignments</h2>
            <p className="section-description">
              Use filters to narrow down to specific schools, departments, and time periods.
              Selected filters will pre-fill the assignment creation form below.
            </p>
          </div>

          <div className="filter-section">
            <h3>Filters</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>School</label>
                <select
                  value={filters.school_id}
                  onChange={(e) => updateFilter('school_id', e.target.value)}
                >
                  <option value="">All Schools</option>
                  {schools.map(s => (
                    <option key={s.school_id} value={s.school_id}>
                      {s.school_name} ({s.school_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Department</label>
                <select
                  value={filters.department_id}
                  onChange={(e) => updateFilter('department_id', e.target.value)}
                  disabled={!filters.school_id}
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.department_id} value={d.department_id}>
                      {d.department_name} ({d.department_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Academic Year</label>
                <select
                  value={filters.academic_year_id}
                  onChange={(e) => updateFilter('academic_year_id', e.target.value)}
                >
                  <option value="">All Years</option>
                  {academicYears.map(y => (
                    <option key={y.academic_year_id} value={y.academic_year_id}>
                      {y.academic_year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Batch</label>
                <select
                  value={filters.batch_id}
                  onChange={(e) => updateFilter('batch_id', e.target.value)}
                >
                  <option value="">All Batches</option>
                  {batches.map(b => (
                    <option key={b.batch_id} value={b.batch_id}>
                      {b.batch_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Semester</label>
                <select
                  value={filters.semester_id}
                  onChange={(e) => updateFilter('semester_id', e.target.value)}
                >
                  <option value="">All Semesters</option>
                  {semesters.map(s => (
                    <option key={s.semester_id} value={s.semester_id}>
                      {s.semester_name} ({s.semester_type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(filters.school_id || filters.department_id || filters.academic_year_id ||
              filters.batch_id || filters.semester_id) && (
              <button
                className="btn-secondary"
                onClick={() => setFilters({
                  school_id: '',
                  department_id: '',
                  academic_year_id: '',
                  batch_id: '',
                  semester_id: ''
                })}
              >
                Clear All Filters
              </button>
            )}
          </div>

          {filters.department_id && (
            <div className="faculty-list-section">
              <h3>Faculty in Selected Department</h3>
              <p className="section-description">
                Faculty members available in the selected department. Use their information to create assignments above.
              </p>

              {faculty.length > 0 && (
                <div className="search-box" style={{marginTop: '16px', marginBottom: '16px'}}>
                  <input
                    type="text"
                    placeholder="Search by faculty name or employee ID (e.g., MBA003)..."
                    value={facultySearch}
                    onChange={(e) => setFacultySearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  {facultySearch && (
                    <button
                      onClick={() => setFacultySearch('')}
                      className="btn-secondary"
                      style={{marginTop: '8px', padding: '6px 12px', fontSize: '13px'}}
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              )}

              {loading && <p>Loading faculty...</p>}
              {!loading && faculty.length === 0 && (
                <p className="no-data">No faculty found in this department.</p>
              )}
              {!loading && faculty.length > 0 && (
                <>
                  {faculty.filter(f =>
                    facultySearch === '' ||
                    f.full_name.toLowerCase().includes(facultySearch.toLowerCase()) ||
                    f.employee_no.toLowerCase().includes(facultySearch.toLowerCase())
                  ).length === 0 && (
                    <p className="no-data">No faculty found matching "{facultySearch}"</p>
                  )}
                  {faculty.filter(f =>
                    facultySearch === '' ||
                    f.full_name.toLowerCase().includes(facultySearch.toLowerCase()) ||
                    f.employee_no.toLowerCase().includes(facultySearch.toLowerCase())
                  ).length > 0 && (
                    <div className="faculty-cards">
                      {faculty
                        .filter(f =>
                          facultySearch === '' ||
                          f.full_name.toLowerCase().includes(facultySearch.toLowerCase()) ||
                          f.employee_no.toLowerCase().includes(facultySearch.toLowerCase())
                        )
                        .map(f => (
                    <div key={f.user_id} className="faculty-card">
                      <div className="faculty-info">
                        <h4>{f.full_name}</h4>
                        <p className="faculty-id">Employee ID: <strong>{f.employee_no}</strong></p>
                        <p className="faculty-email">{f.email}</p>
                        {f.faculty_department_assignment && f.faculty_department_assignment.length > 0 && (
                          <p className="faculty-dept">
                            {f.faculty_department_assignment[0].departments?.department_name}
                          </p>
                        )}
                      </div>
                      <button
                        className="btn-assign"
                        onClick={() => {
                          setAssignmentForm(prev => ({
                            ...prev,
                            faculty_id: f.user_id,
                            course_id: ''
                          }));
                        }}
                      >
                        Select for Assignment
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
            )}
          </div>
          )}

          <div className="create-form">
            <h3>Create New Assignment</h3>
            <form onSubmit={handleCreateAssignment}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Faculty *</label>
                  <select
                    value={assignmentForm.faculty_id}
                    onChange={(e) => setAssignmentForm({...assignmentForm, faculty_id: e.target.value, course_id: ''})}
                    required
                  >
                    <option value="">Select Faculty</option>
                    {faculty.map(f => (
                      <option key={f.user_id} value={f.user_id}>
                        {f.full_name} ({f.employee_no})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Course *</label>
                  <select
                    value={assignmentForm.course_id}
                    onChange={(e) => setAssignmentForm({...assignmentForm, course_id: e.target.value})}
                    required
                  >
                    <option value="">Select Course</option>
                    {availableCourses.map(c => (
                      <option key={c.course_id} value={c.course_id}>
                        {c.course_code} - {c.course_name}
                      </option>
                    ))}
                  </select>
                  {selectedFacultyDepartmentId && (
                    <small style={{color: '#666', fontSize: '12px', marginTop: '4px', display: 'block'}}>
                      Showing only courses from selected faculty's department
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label>Batch *</label>
                  <select
                    value={assignmentForm.batch_id}
                    onChange={(e) => setAssignmentForm({...assignmentForm, batch_id: e.target.value})}
                    required
                  >
                    <option value="">Select Batch</option>
                    {batches.map(b => (
                      <option key={b.batch_id} value={b.batch_id}>
                        {b.batch_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Section *</label>
                  <select
                    value={assignmentForm.section_id}
                    onChange={(e) => setAssignmentForm({...assignmentForm, section_id: e.target.value})}
                    required
                  >
                    <option value="">Select Section</option>
                    {sections.map(s => (
                      <option key={s.section_id} value={s.section_id}>
                        Section {s.section_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Academic Year *</label>
                  <select
                    value={assignmentForm.academic_year_id}
                    onChange={(e) => setAssignmentForm({...assignmentForm, academic_year_id: e.target.value, course_id: ''})}
                    required
                  >
                    <option value="">Select Academic Year</option>
                    {academicYears.map(y => (
                      <option key={y.academic_year_id} value={y.academic_year_id}>
                        {y.academic_year}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Semester *</label>
                  <select
                    value={assignmentForm.semester_id}
                    onChange={(e) => setAssignmentForm({...assignmentForm, semester_id: e.target.value})}
                    required
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

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Assignment'}
              </button>
            </form>
          </div>

          <div className="assignments-list">
            <h3>Existing Assignments</h3>
            {loading && <p>Loading...</p>}
            {!loading && assignments.length === 0 && (
              <p className="no-data">No assignments found. Create one above to get started.</p>
            )}
            {!loading && assignments.length > 0 && (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Faculty</th>
                      <th>Course</th>
                      <th>Batch</th>
                      <th>Section</th>
                      <th>Academic Year</th>
                      <th>Semester</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(assignment => (
                      <tr key={assignment.assignment_id}>
                        <td>
                          {assignment.users?.full_name}<br />
                          <small>({assignment.users?.employee_no})</small>
                        </td>
                        <td>
                          {assignment.courses?.course_code}<br />
                          <small>{assignment.courses?.course_name}</small>
                        </td>
                        <td>{assignment.academic_batches?.batch_name}</td>
                        <td>{assignment.sections?.section_name}</td>
                        <td>{assignment.academic_years?.academic_year}</td>
                        <td>
                          {assignment.semesters?.semester_name}<br />
                          <small>({assignment.semesters?.semester_type})</small>
                        </td>
                        <td>
                          <button
                            className="btn-danger btn-sm"
                            onClick={() => handleDeleteAssignment(assignment.assignment_id)}
                            disabled={loading}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === 'setup' && (
        <div className="management-section">
          <div className="section-header">
            <h2>Academic Year Setup</h2>
            <p className="section-description">
              Select academic year, school, department, batch, semester, and course, then assign faculty to each section.
            </p>
          </div>

          <div className="create-form">
            <h3>Create Academic Year</h3>
            <form onSubmit={handleCreateSetupAcademicYear}>
              <div className="form-grid">
                <div className="form-group">
                  <label>New Academic Year</label>
                  <input
                    type="text"
                    value={setupForm.new_academic_year}
                    onChange={(e) => updateSetupForm('new_academic_year', e.target.value)}
                    placeholder="e.g., 2026-2027"
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={loading || !setupForm.new_academic_year.trim()}>
                Create Academic Year
              </button>
            </form>
          </div>

          <div className="filter-section">
            <h3>Class Setup Filters</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Academic Year *</label>
                <select
                  value={setupForm.academic_year_id}
                  onChange={(e) => updateSetupForm('academic_year_id', e.target.value)}
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map(y => (
                    <option key={y.academic_year_id} value={y.academic_year_id}>{y.academic_year}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>School *</label>
                <select
                  value={setupForm.school_id}
                  onChange={(e) => updateSetupForm('school_id', e.target.value)}
                >
                  <option value="">Select School</option>
                  {schools.map(s => (
                    <option key={s.school_id} value={s.school_id}>{s.school_name} ({s.school_code})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Department *</label>
                <select
                  value={setupForm.department_id}
                  onChange={(e) => updateSetupForm('department_id', e.target.value)}
                  disabled={!setupForm.school_id}
                >
                  <option value="">Select Department</option>
                  {setupDepartments.map(d => (
                    <option key={d.department_id} value={d.department_id}>{d.department_name} ({d.department_code})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Batch *</label>
                <select
                  value={setupForm.batch_id}
                  onChange={(e) => updateSetupForm('batch_id', e.target.value)}
                >
                  <option value="">Select Batch</option>
                  {batches.map(b => (
                    <option key={b.batch_id} value={b.batch_id}>{b.batch_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Year of Study</label>
                <input
                  type="text"
                  value={setupDerivedYearOfStudy ? `Year ${setupDerivedYearOfStudy}` : ''}
                  placeholder={setupHasYearInputs ? 'Invalid batch/year' : 'Select academic year and batch'}
                  disabled
                />
                {setupHasInvalidYear && (
                  <small style={{ color: '#dc3545' }}>Selected batch is not valid for this academic year.</small>
                )}
              </div>

              <div className="form-group">
                <label>Semester *</label>
                <select
                  value={setupForm.semester_id}
                  onChange={(e) => updateSetupForm('semester_id', e.target.value)}
                >
                  <option value="">Select Semester</option>
                  {semesters.map(s => (
                    <option key={s.semester_id} value={s.semester_id}>{s.semester_name} ({s.semester_type})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Course *</label>
                <select
                  value={setupForm.course_id}
                  onChange={(e) => updateSetupForm('course_id', e.target.value)}
                  disabled={!setupForm.department_id || !setupDerivedYearOfStudy}
                >
                  <option value="">
                    {!setupForm.department_id || !setupForm.batch_id || !setupForm.academic_year_id
                      ? 'Select Academic Year, Department, and Batch first'
                      : setupHasInvalidYear
                        ? 'Invalid batch/year combination'
                        : setupCourses.length === 0
                          ? `No courses found for Year ${setupDerivedYearOfStudy}`
                          : 'Select Course'}
                  </option>
                  {setupCourses.map(c => (
                    <option key={c.course_id} value={c.course_id}>{c.course_code} - {c.course_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="create-form">
            <h3>Faculty Department Assignment</h3>
            <p className="section-description">
              If a faculty member is not eligible for this department/year, assign them here first.
            </p>
            <div className="form-grid">
              <div className="form-group">
                <label>Faculty</label>
                <select
                  value={setupFacultyId}
                  onChange={(e) => setSetupFacultyId(e.target.value)}
                  disabled={!setupForm.department_id}
                >
                  <option value="">Select Faculty</option>
                  {faculty.map(f => (
                    <option key={f.user_id} value={f.user_id}>{f.full_name} ({f.employee_no})</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="button" className="btn-primary" onClick={handleAssignFacultyToDepartment} disabled={loading || !setupFacultyId}>
              Assign Faculty to Department for This Year
            </button>
          </div>

          <div className="assignments-list">
            <h3>Assign Faculty to Sections</h3>
            <p className="section-description">
              Eligible faculty are those assigned to the selected department for the selected academic year.
            </p>

            {eligibleSetupFaculty.length > 0 && (
              <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select onChange={(e) => assignFacultyToAllSections(e.target.value)} defaultValue="">
                  <option value="">Assign same faculty to all sections...</option>
                  {eligibleSetupFaculty.map(f => (
                    <option key={f.user_id} value={f.user_id}>{f.full_name} ({f.employee_no})</option>
                  ))}
                </select>
                <button type="button" className="btn-secondary" onClick={() => setSectionAssignments({})}>
                  Clear Sections
                </button>
              </div>
            )}

            {eligibleSetupFaculty.length === 0 && setupForm.department_id && setupForm.academic_year_id && (
              <p className="no-data">No eligible faculty for this department/year yet. Assign faculty above first.</p>
            )}

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>Faculty</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map(section => (
                    <tr key={section.section_id}>
                      <td>Section {section.section_name}</td>
                      <td>
                        <select
                          value={sectionAssignments[section.section_id] || ''}
                          onChange={(e) => updateSectionAssignment(section.section_id, e.target.value)}
                          disabled={eligibleSetupFaculty.length === 0}
                        >
                          <option value="">Not assigned</option>
                          {eligibleSetupFaculty.map(f => (
                            <option key={f.user_id} value={f.user_id}>{f.full_name} ({f.employee_no})</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button type="button" className="btn-primary" onClick={handleSaveSectionAssignments} disabled={loading} style={{ marginTop: '16px' }}>
              Save Section Assignments
            </button>
          </div>
        </div>
      )}

      {activeSection === 'courses' && (
        <div className="management-section">
          <div className="section-header">
            <h2>Course Management</h2>
            <p className="section-description">
              Create and manage courses for different departments.
            </p>
          </div>

          <div className="create-form">
            <h3>{editingCourse ? 'Edit Course' : 'Create New Course'}</h3>
            <form onSubmit={editingCourse ? handleUpdateCourse : handleCreateCourse}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Course Code *</label>
                  <input
                    type="text"
                    value={courseForm.course_code}
                    onChange={(e) => setCourseForm({...courseForm, course_code: e.target.value})}
                    disabled={editingCourse}
                    required
                    placeholder="e.g., CS301"
                  />
                </div>

                <div className="form-group">
                  <label>Course Name *</label>
                  <input
                    type="text"
                    value={courseForm.course_name}
                    onChange={(e) => setCourseForm({...courseForm, course_name: e.target.value})}
                    required
                    placeholder="e.g., Database Management Systems"
                  />
                </div>

                <div className="form-group">
                  <label>Department *</label>
                  <select
                    value={courseForm.department_id}
                    onChange={(e) => setCourseForm({...courseForm, department_id: e.target.value})}
                    disabled={editingCourse}
                    required
                  >
                    <option value="">Select Department</option>
                    {allDepartments.map(d => (
                      <option key={d.department_id} value={d.department_id}>
                        {d.department_name} ({d.department_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Year of Study *</label>
                  <select
                    value={courseForm.year_of_study}
                    onChange={(e) => setCourseForm({...courseForm, year_of_study: e.target.value})}
                    disabled={editingCourse}
                    required
                  >
                    <option value="">Select Year</option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Credits *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={courseForm.credits}
                    onChange={(e) => setCourseForm({...courseForm, credits: e.target.value})}
                    required
                    placeholder="e.g., 4"
                  />
                </div>
              </div>

              <div style={{display: 'flex', gap: '10px'}}>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
                </button>
                {editingCourse && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleCancelEditCourse}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="assignments-list">
            <h3>All Courses</h3>
            {loading && <p>Loading...</p>}
            {!loading && courses.length === 0 && (
              <p className="no-data">No courses found. Create one above to get started.</p>
            )}
            {!loading && courses.length > 0 && (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Course Code</th>
                      <th>Course Name</th>
                      <th>Department</th>
                      <th>Year</th>
                      <th>Credits</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map(course => (
                      <tr key={course.course_id}>
                        <td><strong>{course.course_code}</strong></td>
                        <td>{course.course_name}</td>
                        <td>
                          {allDepartments.find(d => d.department_id === course.department_id)?.department_name || 'N/A'}
                        </td>
                        <td>Year {course.year_of_study}</td>
                        <td>{course.credits}</td>
                        <td>
                          <span className={`badge ${course.status ? 'badge-active' : 'badge-inactive'}`}>
                            {course.status ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-primary btn-sm"
                            onClick={() => handleEditCourse(course)}
                            disabled={loading}
                            style={{fontSize: '12px', padding: '6px 12px'}}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
