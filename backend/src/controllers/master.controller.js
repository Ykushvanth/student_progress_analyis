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
    console.error('Get schools error:', error);
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
    console.error('Get departments error:', error);
    return res.status(500).json({ error: 'Failed to fetch departments' });
  }
}

async function getAcademicYears(req, res) {
  try {
    const { data, error } = await supabase
      .from('academic_years')
      .select('academic_year_id, academic_year')
      .order('academic_year', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ academic_years: data });
  } catch (error) {
    console.error('Get academic years error:', error);
    return res.status(500).json({ error: 'Failed to fetch academic years' });
  }
}

async function getSemesters(req, res) {
  try {
    const { data, error } = await supabase
      .from('semesters')
      .select('semester_id, semester_name, semester_type')
      .order('semester_id');

    if (error) throw error;

    return res.status(200).json({ semesters: data });
  } catch (error) {
    console.error('Get semesters error:', error);
    return res.status(500).json({ error: 'Failed to fetch semesters' });
  }
}

async function getBatches(req, res) {
  try {
    const { data, error } = await supabase
      .from('academic_batches')
      .select('batch_id, batch_name, start_year, end_year')
      .order('start_year', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ batches: data });
  } catch (error) {
    console.error('Get batches error:', error);
    return res.status(500).json({ error: 'Failed to fetch batches' });
  }
}

async function getSections(req, res) {
  try {
    const { data, error } = await supabase
      .from('sections')
      .select('section_id, section_name')
      .order('section_name');

    if (error) throw error;

    return res.status(200).json({ sections: data });
  } catch (error) {
    console.error('Get sections error:', error);
    return res.status(500).json({ error: 'Failed to fetch sections' });
  }
}

async function getCourses(req, res) {
  try {
    const { department_id, year_of_study } = req.query;

    let query = supabase
      .from('courses')
      .select('course_id, course_code, course_name, department_id, year_of_study, credits, status')
      .eq('status', true)
      .order('course_name');

    if (department_id) {
      query = query.eq('department_id', department_id);
    }

    if (year_of_study) {
      query = query.eq('year_of_study', parseInt(year_of_study));
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({ courses: data });
  } catch (error) {
    console.error('Get courses error:', error);
    return res.status(500).json({ error: 'Failed to fetch courses' });
  }
}

module.exports = {
  getSchools,
  getDepartments,
  getAcademicYears,
  getSemesters,
  getBatches,
  getSections,
  getCourses
};
