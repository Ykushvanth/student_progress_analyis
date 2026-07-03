const supabase = require('../db/supabaseClient');

async function getSchools(req, res) {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('school_id, school_code, school_name, status')
      .eq('status', true)
      .order('school_name');

    if (error) throw error;

    return res.status(200).json({ schools: data });
  } catch (error) {
    console.error('IQAC get schools error:', error);
    return res.status(500).json({ error: 'Failed to fetch schools' });
  }
}

async function getDepartments(req, res) {
  try {
    const { school_id } = req.query;

    let query = supabase
      .from('departments')
      .select('department_id, department_code, department_name, school_id, status')
      .eq('status', true)
      .order('department_name');

    if (school_id) {
      query = query.eq('school_id', school_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({ departments: data });
  } catch (error) {
    console.error('IQAC get departments error:', error);
    return res.status(500).json({ error: 'Failed to fetch departments' });
  }
}

async function getCourses(req, res) {
  try {
    const { department_id } = req.query;

    let query = supabase
      .from('courses')
      .select('course_id, course_code, course_name, department_id, year_of_study, credits, status')
      .eq('status', true)
      .order('course_code');

    if (department_id) {
      query = query.eq('department_id', department_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({ courses: data });
  } catch (error) {
    console.error('IQAC get courses error:', error);
    return res.status(500).json({ error: 'Failed to fetch courses' });
  }
}

async function getWorkflowStages(req, res) {
  try {
    const { data, error } = await supabase
      .from('workflow_stage')
      .select('*')
      .order('stage_id');

    if (error) throw error;

    return res.status(200).json({ stages: data });
  } catch (error) {
    console.error('IQAC get workflow stages error:', error);
    return res.status(500).json({ error: 'Failed to fetch workflow stages' });
  }
}

async function getAnalytics(req, res) {
  try {
    const { school_id, department_id, batch_id, academic_year_id, semester_id, course_id } = req.query;

    // First, filter courses based on school_id and/or department_id if provided
    let courseIds = null;
    if (school_id || department_id) {
      let courseQuery = supabase
        .from('courses')
        .select('course_id, department_id, departments!inner(school_id)')
        .eq('status', true);

      if (department_id) {
        courseQuery = courseQuery.eq('department_id', department_id);
      }
      if (school_id) {
        courseQuery = courseQuery.eq('departments.school_id', school_id);
      }

      const { data: filteredCourses, error: courseError } = await courseQuery;
      if (courseError) throw courseError;

      courseIds = filteredCourses.map(c => c.course_id);

      // If no courses match the school/department filter, return empty results
      if (courseIds.length === 0) {
        return res.status(200).json({ analytics: [] });
      }
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
        courses (
          course_code,
          course_name,
          department_id,
          departments (
            department_name,
            school_id,
            schools (school_name)
          )
        ),
        users (full_name, employee_no),
        academic_batches (batch_name),
        sections (section_name),
        academic_years (academic_year),
        semesters (semester_name, semester_type)
      `);

    // Apply filters
    if (courseIds !== null) query = query.in('course_id', courseIds);
    if (course_id) query = query.eq('course_id', course_id);
    if (batch_id) query = query.eq('batch_id', batch_id);
    if (academic_year_id) query = query.eq('academic_year_id', academic_year_id);
    if (semester_id) query = query.eq('semester_id', semester_id);

    const { data: assignments, error: assignmentsError } = await query;

    if (assignmentsError) throw assignmentsError;

    const assignmentIds = assignments.map(a => a.assignment_id);

    let effectiveness = [];
    if (assignmentIds.length > 0) {
      const { data: effectivenessData, error: effectivenessError } = await supabase
        .from('faculty_effectiveness')
        .select('*')
        .in('assignment_id', assignmentIds);

      if (effectivenessError) throw effectivenessError;
      effectiveness = effectivenessData || [];
    }

    const effectivenessMap = {};
    effectiveness.forEach(e => {
      effectivenessMap[e.assignment_id] = e;
    });

    const analytics = assignments.map(a => ({
      assignment_id: a.assignment_id,
      school: a.courses?.departments?.schools?.school_name || null,
      department: a.courses?.departments?.department_name || null,
      course: {
        code: a.courses?.course_code,
        name: a.courses?.course_name
      },
      faculty: {
        name: a.users?.full_name,
        employee_no: a.users?.employee_no
      },
      batch: a.academic_batches?.batch_name,
      section: a.sections?.section_name,
      academic_year: a.academic_years?.academic_year,
      semester: a.semesters?.semester_name,
      effectiveness: effectivenessMap[a.assignment_id] || null
    }));

    return res.status(200).json({ analytics });
  } catch (error) {
    console.error('IQAC get analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

async function openWorkflowStage(req, res) {
  try {
    const { stage_id } = req.params;
    const userId = req.user.user_id;

    const { data: stage, error: stageError } = await supabase
      .from('workflow_stage')
      .select('*')
      .eq('stage_id', stage_id)
      .single();

    if (stageError || !stage) {
      return res.status(404).json({ error: 'Workflow stage not found' });
    }

    if (stage.is_open) {
      return res.status(400).json({
        error: 'Stage is already open'
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from('workflow_stage')
      .update({
        is_open: true,
        opened_by: userId,
        opened_at: new Date().toISOString()
      })
      .eq('stage_id', stage_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.status(200).json({
      message: 'Workflow stage opened successfully',
      stage: updated
    });
  } catch (error) {
    console.error('Open workflow stage error:', error);
    return res.status(500).json({ error: 'Failed to open workflow stage' });
  }
}

async function closeWorkflowStage(req, res) {
  try {
    const { stage_id } = req.params;

    const { data: stage, error: stageError } = await supabase
      .from('workflow_stage')
      .select('*')
      .eq('stage_id', stage_id)
      .single();

    if (stageError || !stage) {
      return res.status(404).json({ error: 'Workflow stage not found' });
    }

    if (!stage.is_open) {
      return res.status(400).json({
        error: 'Stage is already closed'
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from('workflow_stage')
      .update({
        is_open: false,
        closed_at: new Date().toISOString()
      })
      .eq('stage_id', stage_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.status(200).json({
      message: 'Workflow stage closed successfully',
      stage: updated
    });
  } catch (error) {
    console.error('Close workflow stage error:', error);
    return res.status(500).json({ error: 'Failed to close workflow stage' });
  }
}

module.exports = {
  getSchools,
  getDepartments,
  getCourses,
  getAnalytics,
  getWorkflowStages,
  openWorkflowStage,
  closeWorkflowStage
};
