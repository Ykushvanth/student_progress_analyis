const supabase = require('../db/supabaseClient');

async function getDepartmentFaculty(req, res) {
  try {
    const { department_id } = req.params;
    const userId = req.user.user_id;

    const { data: hodAssignment, error: hodError } = await supabase
      .from('hod_assignment')
      .select('department_id')
      .eq('user_id', userId)
      .eq('department_id', department_id)
      .eq('active', true)
      .maybeSingle();

    if (hodError) throw hodError;

    if (!hodAssignment) {
      return res.status(403).json({
        error: 'Not authorized for this department'
      });
    }

    const { data: faculty, error: facultyError } = await supabase
      .from('faculty_department_assignment')
      .select(`
        user_id,
        users (
          user_id,
          employee_no,
          full_name,
          email
        )
      `)
      .eq('department_id', department_id)
      .eq('active', true);

    if (facultyError) throw facultyError;

    return res.status(200).json({
      faculty: faculty.map(f => f.users)
    });
  } catch (error) {
    console.error('Get department faculty error:', error);
    return res.status(500).json({ error: 'Failed to fetch faculty' });
  }
}

async function getCourses(req, res) {
  try {
    const { department_id, academic_year_id, semester_id, batch_id } = req.query;
    const userId = req.user.user_id;

    if (!department_id) {
      return res.status(400).json({ error: 'department_id is required' });
    }

    const { data: hodAssignment, error: hodError } = await supabase
      .from('hod_assignment')
      .select('department_id')
      .eq('user_id', userId)
      .eq('department_id', department_id)
      .eq('active', true)
      .maybeSingle();

    if (hodError) throw hodError;

    if (!hodAssignment) {
      return res.status(403).json({
        error: 'Not authorized for this department'
      });
    }

    let query = supabase
      .from('faculty_course_assignment')
      .select(`
        assignment_id,
        faculty_id,
        course_id,
        batch_id,
        section_id,
        academic_year_id,
        semester_id,
        courses (course_code, course_name, credits, department_id),
        users (full_name, employee_no),
        academic_batches (batch_name),
        sections (section_name)
      `)
      .eq('courses.department_id', department_id);

    if (academic_year_id) query = query.eq('academic_year_id', academic_year_id);
    if (semester_id) query = query.eq('semester_id', semester_id);
    if (batch_id) query = query.eq('batch_id', batch_id);

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({ courses: data });
  } catch (error) {
    console.error('Get HOD courses error:', error);
    return res.status(500).json({ error: 'Failed to fetch courses' });
  }
}

async function getAnalytics(req, res) {
  try {
    const { course_id } = req.query;
    const userId = req.user.user_id;

    if (!course_id) {
      return res.status(400).json({ error: 'course_id is required' });
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('department_id')
      .eq('course_id', course_id)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const { data: hodAssignment, error: hodError } = await supabase
      .from('hod_assignment')
      .select('department_id')
      .eq('user_id', userId)
      .eq('department_id', course.department_id)
      .eq('active', true)
      .maybeSingle();

    if (hodError) throw hodError;

    if (!hodAssignment) {
      return res.status(403).json({
        error: 'Not authorized for this department'
      });
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from('faculty_course_assignment')
      .select(`
        assignment_id,
        faculty_id,
        section_id,
        users (full_name, employee_no),
        sections (section_name)
      `)
      .eq('course_id', course_id);

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

    const analytics = assignments.map(a => ({
      assignment_id: a.assignment_id,
      faculty: {
        name: a.users.full_name,
        employee_no: a.users.employee_no
      },
      section: a.sections.section_name,
      effectiveness: effectivenessMap[a.assignment_id] || null
    }));

    return res.status(200).json({ analytics });
  } catch (error) {
    console.error('Get HOD analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

module.exports = {
  getDepartmentFaculty,
  getCourses,
  getAnalytics
};
