const supabase = require('../db/supabaseClient');

async function getDepartments(req, res) {
  try {
    const { school_id } = req.params;
    const userId = req.user.user_id;

    const { data: deanAssignment, error: deanError } = await supabase
      .from('dean_assignment')
      .select('school_id')
      .eq('user_id', userId)
      .eq('school_id', school_id)
      .eq('active', true)
      .maybeSingle();

    if (deanError) throw deanError;

    if (!deanAssignment) {
      return res.status(403).json({
        error: 'Not authorized for this school'
      });
    }

    const { data: departments, error: departmentsError } = await supabase
      .from('departments')
      .select('department_id, department_code, department_name, status')
      .eq('school_id', school_id)
      .eq('status', true)
      .order('department_name');

    if (departmentsError) throw departmentsError;

    return res.status(200).json({ departments });
  } catch (error) {
    console.error('Get dean departments error:', error);
    return res.status(500).json({ error: 'Failed to fetch departments' });
  }
}

async function getAnalytics(req, res) {
  try {
    const { department_id, batch_id, academic_year_id, semester_id } = req.query;
    const userId = req.user.user_id;

    if (!department_id) {
      return res.status(400).json({ error: 'department_id is required' });
    }

    const { data: department, error: deptError } = await supabase
      .from('departments')
      .select('school_id')
      .eq('department_id', department_id)
      .single();

    if (deptError || !department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const { data: deanAssignment, error: deanError } = await supabase
      .from('dean_assignment')
      .select('school_id')
      .eq('user_id', userId)
      .eq('school_id', department.school_id)
      .eq('active', true)
      .maybeSingle();

    if (deanError) throw deanError;

    if (!deanAssignment) {
      return res.status(403).json({
        error: 'Not authorized for this school'
      });
    }

    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('course_id, course_code, course_name')
      .eq('department_id', department_id)
      .eq('status', true);

    if (coursesError) throw coursesError;

    const courseIds = courses.map(c => c.course_id);

    let assignmentQuery = supabase
      .from('faculty_course_assignment')
      .select(`
        assignment_id,
        course_id,
        faculty_id,
        batch_id,
        section_id,
        users (full_name, employee_no),
        sections (section_name)
      `)
      .in('course_id', courseIds);

    if (batch_id) assignmentQuery = assignmentQuery.eq('batch_id', batch_id);
    if (academic_year_id) assignmentQuery = assignmentQuery.eq('academic_year_id', academic_year_id);
    if (semester_id) assignmentQuery = assignmentQuery.eq('semester_id', semester_id);

    const { data: assignments, error: assignmentsError } = await assignmentQuery;

    if (assignmentsError) throw assignmentsError;

    const assignmentIds = assignments.map(a => a.assignment_id);

    const { data: effectiveness, error: effectivenessError } = await supabase
      .from('faculty_effectiveness')
      .select('*')
      .in('assignment_id', assignmentIds);

    if (effectivenessError) throw effectivenessError;

    const effectivenessMap = {};
    (effectiveness || []).forEach(e => {
      effectivenessMap[e.assignment_id] = e;
    });

    const courseMap = {};
    courses.forEach(c => {
      courseMap[c.course_id] = c;
    });

    const analytics = assignments.map(a => ({
      assignment_id: a.assignment_id,
      course: courseMap[a.course_id],
      faculty: {
        name: a.users.full_name,
        employee_no: a.users.employee_no
      },
      section: a.sections.section_name,
      effectiveness: effectivenessMap[a.assignment_id] || null
    }));

    return res.status(200).json({ analytics });
  } catch (error) {
    console.error('Get dean analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

module.exports = {
  getDepartments,
  getAnalytics
};
