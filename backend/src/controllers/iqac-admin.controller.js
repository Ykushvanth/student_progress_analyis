const supabase = require('../db/supabaseClient');

// ============================================================================
// FACULTY MANAGEMENT
// ============================================================================

async function getFaculty(req, res) {
  try {
    const { department_id } = req.query;

    let query = supabase
      .from('users')
      .select(`
        user_id,
        employee_no,
        full_name,
        email,
        phone,
        is_active,
        user_roles!inner (
          role_id,
          roles!inner (role_name)
        ),
        faculty_department_assignment (
          id,
          department_id,
          academic_year_id,
          active,
          departments (department_code, department_name),
          academic_years (academic_year)
        )
      `)
      .eq('user_roles.roles.role_name', 'Faculty')
      .eq('is_active', true)
      .order('full_name');

    const { data, error } = await query;

    if (error) throw error;

    // Filter by department if specified
    let faculty = data || [];
    if (department_id) {
      faculty = faculty.filter(f =>
        f.faculty_department_assignment?.some(fda =>
          fda.department_id === parseInt(department_id) && fda.active
        )
      );
    }

    return res.status(200).json({ faculty });
  } catch (error) {
    console.error('Get faculty error:', error);
    return res.status(500).json({ error: 'Failed to fetch faculty' });
  }
}

async function createFaculty(req, res) {
  try {
    const {
      employee_no,
      full_name,
      email,
      phone,
      department_id,
      academic_year_id
    } = req.body;

    if (!employee_no || !full_name || !email || !department_id || !academic_year_id) {
      return res.status(400).json({
        error: 'employee_no, full_name, email, department_id, and academic_year_id are required'
      });
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Check if employee_no already exists
    const { data: existingEmpNo } = await supabase
      .from('users')
      .select('user_id')
      .eq('employee_no', employee_no)
      .maybeSingle();

    if (existingEmpNo) {
      return res.status(400).json({ error: 'Employee number already exists' });
    }

    // Create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        employee_no,
        full_name,
        email,
        phone,
        is_active: true
      })
      .select()
      .single();

    if (userError) throw userError;

    // Get Faculty role_id
    const { data: facultyRole } = await supabase
      .from('roles')
      .select('role_id')
      .eq('role_name', 'Faculty')
      .single();

    if (!facultyRole) {
      return res.status(500).json({ error: 'Faculty role not found in database' });
    }

    // Assign Faculty role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.user_id,
        role_id: facultyRole.role_id
      });

    if (roleError) throw roleError;

    // Assign to department
    const { error: deptError } = await supabase
      .from('faculty_department_assignment')
      .insert({
        user_id: user.user_id,
        department_id,
        academic_year_id,
        active: true
      });

    if (deptError) throw deptError;

    return res.status(201).json({
      message: 'Faculty created successfully',
      faculty: user
    });
  } catch (error) {
    console.error('Create faculty error:', error);
    return res.status(500).json({ error: 'Failed to create faculty' });
  }
}

async function updateFaculty(req, res) {
  try {
    const { user_id } = req.params;
    const { full_name, email, phone, is_active } = req.body;

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      message: 'Faculty updated successfully',
      faculty: data
    });
  } catch (error) {
    console.error('Update faculty error:', error);
    return res.status(500).json({ error: 'Failed to update faculty' });
  }
}

async function createFacultyDepartmentAssignment(req, res) {
  try {
    const { user_id, department_id, academic_year_id } = req.body;

    if (!user_id || !department_id || !academic_year_id) {
      return res.status(400).json({
        error: 'user_id, department_id, and academic_year_id are required'
      });
    }

    const { data: facultyUser, error: userError } = await supabase
      .from('users')
      .select(`
        user_id,
        full_name,
        user_roles!inner (
          roles!inner (role_name)
        )
      `)
      .eq('user_id', user_id)
      .eq('user_roles.roles.role_name', 'Faculty')
      .maybeSingle();

    if (userError) throw userError;

    if (!facultyUser) {
      return res.status(400).json({ error: 'Selected user is not an active faculty member' });
    }

    const { data: existingSame, error: sameError } = await supabase
      .from('faculty_department_assignment')
      .select('id')
      .eq('user_id', user_id)
      .eq('department_id', department_id)
      .eq('academic_year_id', academic_year_id)
      .eq('active', true)
      .maybeSingle();

    if (sameError) throw sameError;

    if (existingSame) {
      return res.status(200).json({
        message: 'Faculty is already assigned to this department for the selected academic year',
        assignment: existingSame
      });
    }

    const { data: existingOther, error: otherError } = await supabase
      .from('faculty_department_assignment')
      .select('id, department_id, departments (department_name, department_code)')
      .eq('user_id', user_id)
      .eq('academic_year_id', academic_year_id)
      .eq('active', true)
      .maybeSingle();

    if (otherError) throw otherError;

    if (existingOther) {
      return res.status(400).json({
        error: `Faculty is already assigned to ${existingOther.departments?.department_name || 'another department'} for this academic year`
      });
    }

    const { data, error } = await supabase
      .from('faculty_department_assignment')
      .insert({
        user_id,
        department_id,
        academic_year_id,
        active: true
      })
      .select(`
        id,
        user_id,
        department_id,
        academic_year_id,
        active,
        users (full_name, employee_no),
        departments (department_name, department_code),
        academic_years (academic_year)
      `)
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Faculty assigned to department for academic year successfully',
      assignment: data
    });
  } catch (error) {
    console.error('Create faculty department assignment error:', error);
    return res.status(500).json({ error: 'Failed to assign faculty to department' });
  }
}

// ============================================================================
// FACULTY COURSE ASSIGNMENT MANAGEMENT
// ============================================================================

async function getFacultyAssignments(req, res) {
  try {
    const { faculty_id, course_id, academic_year_id, semester_id, department_id } = req.query;

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
        users (user_id, employee_no, full_name),
        courses (course_id, course_code, course_name, department_id),
        academic_batches (batch_id, batch_name),
        sections (section_id, section_name),
        academic_years (academic_year_id, academic_year),
        semesters (semester_id, semester_name, semester_type)
      `)
      .order('academic_year_id', { ascending: false });

    if (faculty_id) query = query.eq('faculty_id', faculty_id);
    if (course_id) query = query.eq('course_id', course_id);
    if (academic_year_id) query = query.eq('academic_year_id', academic_year_id);
    if (semester_id) query = query.eq('semester_id', semester_id);

    const { data, error } = await query;

    if (error) throw error;

    // Filter by department if specified
    let assignments = data || [];
    if (department_id) {
      assignments = assignments.filter(a =>
        a.courses?.department_id === parseInt(department_id)
      );
    }

    return res.status(200).json({ assignments });
  } catch (error) {
    console.error('Get faculty assignments error:', error);
    return res.status(500).json({ error: 'Failed to fetch faculty assignments' });
  }
}

async function createFacultyAssignment(req, res) {
  try {
    const {
      faculty_id,
      course_id,
      batch_id,
      section_id,
      academic_year_id,
      semester_id
    } = req.body;

    if (!faculty_id || !course_id || !batch_id || !section_id || !academic_year_id || !semester_id) {
      return res.status(400).json({
        error: 'faculty_id, course_id, batch_id, section_id, academic_year_id, and semester_id are required'
      });
    }

    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('faculty_course_assignment')
      .select('assignment_id')
      .eq('faculty_id', faculty_id)
      .eq('course_id', course_id)
      .eq('batch_id', batch_id)
      .eq('section_id', section_id)
      .eq('academic_year_id', academic_year_id)
      .eq('semester_id', semester_id)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({
        error: 'This faculty course assignment already exists'
      });
    }

    // Verify faculty belongs to the course's department
    const { data: course } = await supabase
      .from('courses')
      .select('department_id')
      .eq('course_id', course_id)
      .single();

    const { data: facultyDept } = await supabase
      .from('faculty_department_assignment')
      .select('department_id')
      .eq('user_id', faculty_id)
      .eq('academic_year_id', academic_year_id)
      .eq('active', true)
      .maybeSingle();

    if (!facultyDept || facultyDept.department_id !== course.department_id) {
      return res.status(400).json({
        error: 'Faculty must be assigned to the course department for this academic year'
      });
    }

    // Create assignment
    const { data, error } = await supabase
      .from('faculty_course_assignment')
      .insert({
        faculty_id,
        course_id,
        batch_id,
        section_id,
        academic_year_id,
        semester_id
      })
      .select(`
        assignment_id,
        faculty_id,
        course_id,
        batch_id,
        section_id,
        academic_year_id,
        semester_id,
        users (employee_no, full_name),
        courses (course_code, course_name),
        academic_batches (batch_name),
        sections (section_name),
        academic_years (academic_year),
        semesters (semester_name, semester_type)
      `)
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Faculty course assignment created successfully',
      assignment: data
    });
  } catch (error) {
    console.error('Create faculty assignment error:', error);
    return res.status(500).json({ error: 'Failed to create faculty assignment' });
  }
}

async function createCourseSectionAssignments(req, res) {
  try {
    const {
      course_id,
      batch_id,
      academic_year_id,
      semester_id,
      section_assignments
    } = req.body;

    if (!course_id || !batch_id || !academic_year_id || !semester_id || !Array.isArray(section_assignments)) {
      return res.status(400).json({
        error: 'course_id, batch_id, academic_year_id, semester_id, and section_assignments[] are required'
      });
    }

    const validSectionAssignments = section_assignments.filter(row => row.section_id && row.faculty_id);
    if (validSectionAssignments.length === 0) {
      return res.status(400).json({ error: 'At least one section assignment with section_id and faculty_id is required' });
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('course_id, course_code, course_name, department_id')
      .eq('course_id', course_id)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const results = {
      created: [],
      skipped: [],
      failed: []
    };

    for (const row of validSectionAssignments) {
      const { section_id, faculty_id } = row;

      try {
        const { data: facultyDept, error: facultyDeptError } = await supabase
          .from('faculty_department_assignment')
          .select('id')
          .eq('user_id', faculty_id)
          .eq('department_id', course.department_id)
          .eq('academic_year_id', academic_year_id)
          .eq('active', true)
          .maybeSingle();

        if (facultyDeptError) throw facultyDeptError;

        if (!facultyDept) {
          results.failed.push({
            section_id,
            faculty_id,
            reason: 'Faculty is not assigned to this course department for the selected academic year'
          });
          continue;
        }

        const { data: existing, error: existingError } = await supabase
          .from('faculty_course_assignment')
          .select('assignment_id, faculty_id, users (full_name, employee_no)')
          .eq('course_id', course_id)
          .eq('batch_id', batch_id)
          .eq('section_id', section_id)
          .eq('academic_year_id', academic_year_id)
          .eq('semester_id', semester_id)
          .maybeSingle();

        if (existingError) throw existingError;

        if (existing) {
          results.skipped.push({
            section_id,
            faculty_id,
            assignment_id: existing.assignment_id,
            reason: existing.faculty_id === faculty_id
              ? 'Assignment already exists'
              : `Section already assigned to ${existing.users?.full_name || 'another faculty'}`
          });
          continue;
        }

        const { data: created, error: createError } = await supabase
          .from('faculty_course_assignment')
          .insert({
            faculty_id,
            course_id,
            batch_id,
            section_id,
            academic_year_id,
            semester_id
          })
          .select(`
            assignment_id,
            faculty_id,
            course_id,
            batch_id,
            section_id,
            academic_year_id,
            semester_id,
            users (employee_no, full_name),
            courses (course_code, course_name),
            academic_batches (batch_name),
            sections (section_name),
            academic_years (academic_year),
            semesters (semester_name, semester_type)
          `)
          .single();

        if (createError) throw createError;

        results.created.push(created);
      } catch (rowError) {
        console.error('Create course section assignment row error:', rowError);
        results.failed.push({
          section_id,
          faculty_id,
          reason: 'Failed to create assignment'
        });
      }
    }

    return res.status(200).json({
      message: `Created ${results.created.length} assignment(s), skipped ${results.skipped.length}, failed ${results.failed.length}`,
      results
    });
  } catch (error) {
    console.error('Create course section assignments error:', error);
    return res.status(500).json({ error: 'Failed to create course section assignments' });
  }
}

async function deleteFacultyAssignment(req, res) {
  try {
    const { assignment_id } = req.params;

    // Check if there are enrollments
    const { data: enrollments } = await supabase
      .from('student_course_enrollment')
      .select('enrollment_id')
      .eq('assignment_id', assignment_id)
      .limit(1);

    if (enrollments && enrollments.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete assignment with existing student enrollments'
      });
    }

    const { error } = await supabase
      .from('faculty_course_assignment')
      .delete()
      .eq('assignment_id', assignment_id);

    if (error) throw error;

    return res.status(200).json({
      message: 'Faculty course assignment deleted successfully'
    });
  } catch (error) {
    console.error('Delete faculty assignment error:', error);
    return res.status(500).json({ error: 'Failed to delete faculty assignment' });
  }
}

// ============================================================================
// STUDENT MANAGEMENT
// ============================================================================

async function getStudents(req, res) {
  try {
    const { department_id, batch_id, section_id } = req.query;

    let query = supabase
      .from('students')
      .select(`
        student_id,
        register_no,
        student_name,
        batch_id,
        department_id,
        section_id,
        email,
        status,
        academic_batches (batch_name),
        departments (department_code, department_name),
        sections (section_name)
      `)
      .eq('status', true)
      .order('register_no');

    if (department_id) query = query.eq('department_id', department_id);
    if (batch_id) query = query.eq('batch_id', batch_id);
    if (section_id) query = query.eq('section_id', section_id);

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({ students: data || [] });
  } catch (error) {
    console.error('Get students error:', error);
    return res.status(500).json({ error: 'Failed to fetch students' });
  }
}

async function createStudent(req, res) {
  try {
    const {
      register_no,
      student_name,
      batch_id,
      department_id,
      section_id,
      email
    } = req.body;

    if (!register_no || !student_name || !batch_id || !department_id || !section_id) {
      return res.status(400).json({
        error: 'register_no, student_name, batch_id, department_id, and section_id are required'
      });
    }

    // Check if register_no already exists
    const { data: existing } = await supabase
      .from('students')
      .select('student_id')
      .eq('register_no', register_no)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'Register number already exists' });
    }

    const { data, error } = await supabase
      .from('students')
      .insert({
        register_no,
        student_name,
        batch_id,
        department_id,
        section_id,
        email,
        status: true
      })
      .select(`
        student_id,
        register_no,
        student_name,
        batch_id,
        department_id,
        section_id,
        email,
        status,
        academic_batches (batch_name),
        departments (department_code, department_name),
        sections (section_name)
      `)
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Student created successfully',
      student: data
    });
  } catch (error) {
    console.error('Create student error:', error);
    return res.status(500).json({ error: 'Failed to create student' });
  }
}

async function updateStudent(req, res) {
  try {
    const { student_id } = req.params;
    const { student_name, email, section_id, status } = req.body;

    const updates = {};
    if (student_name !== undefined) updates.student_name = student_name;
    if (email !== undefined) updates.email = email;
    if (section_id !== undefined) updates.section_id = section_id;
    if (status !== undefined) updates.status = status;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('student_id', student_id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      message: 'Student updated successfully',
      student: data
    });
  } catch (error) {
    console.error('Update student error:', error);
    return res.status(500).json({ error: 'Failed to update student' });
  }
}

// ============================================================================
// ENROLLMENT MANAGEMENT
// ============================================================================

async function getEnrollments(req, res) {
  try {
    const { assignment_id, student_id } = req.query;

    let query = supabase
      .from('student_course_enrollment')
      .select(`
        enrollment_id,
        student_id,
        assignment_id,
        students (register_no, student_name, email),
        faculty_course_assignment (
          assignment_id,
          users (full_name, employee_no),
          courses (course_code, course_name),
          academic_batches (batch_name),
          sections (section_name),
          academic_years (academic_year),
          semesters (semester_name, semester_type)
        )
      `)
      .order('enrollment_id');

    if (assignment_id) query = query.eq('assignment_id', assignment_id);
    if (student_id) query = query.eq('student_id', student_id);

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({ enrollments: data || [] });
  } catch (error) {
    console.error('Get enrollments error:', error);
    return res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
}

async function createEnrollment(req, res) {
  try {
    const { student_id, assignment_id } = req.body;

    if (!student_id || !assignment_id) {
      return res.status(400).json({
        error: 'student_id and assignment_id are required'
      });
    }

    // Check if enrollment already exists
    const { data: existing } = await supabase
      .from('student_course_enrollment')
      .select('enrollment_id')
      .eq('student_id', student_id)
      .eq('assignment_id', assignment_id)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({
        error: 'This student is already enrolled in this course assignment'
      });
    }

    // Verify student and assignment match (same batch, section)
    const { data: student } = await supabase
      .from('students')
      .select('batch_id, section_id, department_id')
      .eq('student_id', student_id)
      .single();

    const { data: assignment } = await supabase
      .from('faculty_course_assignment')
      .select('batch_id, section_id, courses!inner(department_id)')
      .eq('assignment_id', assignment_id)
      .single();

    if (!student || !assignment) {
      return res.status(404).json({ error: 'Student or assignment not found' });
    }

    if (student.batch_id !== assignment.batch_id ||
        student.section_id !== assignment.section_id ||
        student.department_id !== assignment.courses.department_id) {
      return res.status(400).json({
        error: 'Student batch/section/department must match the course assignment'
      });
    }

    const { data, error } = await supabase
      .from('student_course_enrollment')
      .insert({ student_id, assignment_id })
      .select(`
        enrollment_id,
        student_id,
        assignment_id,
        students (register_no, student_name),
        faculty_course_assignment (
          users (full_name),
          courses (course_code, course_name)
        )
      `)
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Student enrolled successfully',
      enrollment: data
    });
  } catch (error) {
    console.error('Create enrollment error:', error);
    return res.status(500).json({ error: 'Failed to create enrollment' });
  }
}

async function deleteEnrollment(req, res) {
  try {
    const { enrollment_id } = req.params;

    // Check if there is performance data
    const { data: performance } = await supabase
      .from('student_course_performance')
      .select('performance_id')
      .eq('enrollment_id', enrollment_id)
      .limit(1);

    if (performance && performance.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete enrollment with existing performance data'
      });
    }

    const { error } = await supabase
      .from('student_course_enrollment')
      .delete()
      .eq('enrollment_id', enrollment_id);

    if (error) throw error;

    return res.status(200).json({
      message: 'Enrollment deleted successfully'
    });
  } catch (error) {
    console.error('Delete enrollment error:', error);
    return res.status(500).json({ error: 'Failed to delete enrollment' });
  }
}

// ============================================================================
// MASTER DATA MANAGEMENT
// ============================================================================

async function createSchool(req, res) {
  try {
    const { school_code, school_name } = req.body;

    if (!school_code || !school_name) {
      return res.status(400).json({ error: 'school_code and school_name are required' });
    }

    const { data, error } = await supabase
      .from('schools')
      .insert({ school_code, school_name, status: true })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ message: 'School created successfully', school: data });
  } catch (error) {
    console.error('Create school error:', error);
    return res.status(500).json({ error: 'Failed to create school' });
  }
}

async function updateSchool(req, res) {
  try {
    const { school_id } = req.params;
    const { school_name, status } = req.body;

    const updates = {};
    if (school_name !== undefined) updates.school_name = school_name;
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabase
      .from('schools')
      .update(updates)
      .eq('school_id', school_id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ message: 'School updated successfully', school: data });
  } catch (error) {
    console.error('Update school error:', error);
    return res.status(500).json({ error: 'Failed to update school' });
  }
}

async function createDepartment(req, res) {
  try {
    const { school_id, department_code, department_name } = req.body;

    if (!school_id || !department_code || !department_name) {
      return res.status(400).json({
        error: 'school_id, department_code, and department_name are required'
      });
    }

    const { data, error } = await supabase
      .from('departments')
      .insert({ school_id, department_code, department_name, status: true })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ message: 'Department created successfully', department: data });
  } catch (error) {
    console.error('Create department error:', error);
    return res.status(500).json({ error: 'Failed to create department' });
  }
}

async function updateDepartment(req, res) {
  try {
    const { department_id } = req.params;
    const { department_name, status } = req.body;

    const updates = {};
    if (department_name !== undefined) updates.department_name = department_name;
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabase
      .from('departments')
      .update(updates)
      .eq('department_id', department_id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ message: 'Department updated successfully', department: data });
  } catch (error) {
    console.error('Update department error:', error);
    return res.status(500).json({ error: 'Failed to update department' });
  }
}

async function createCourse(req, res) {
  try {
    const { course_code, course_name, department_id, year_of_study, credits } = req.body;

    if (!course_code || !course_name || !department_id || !year_of_study) {
      return res.status(400).json({
        error: 'course_code, course_name, department_id, and year_of_study are required'
      });
    }

    const { data, error } = await supabase
      .from('courses')
      .insert({
        course_code,
        course_name,
        department_id,
        year_of_study,
        credits: credits || 3.0,
        status: true
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ message: 'Course created successfully', course: data });
  } catch (error) {
    console.error('Create course error:', error);
    return res.status(500).json({ error: 'Failed to create course' });
  }
}

async function updateCourse(req, res) {
  try {
    const { course_id } = req.params;
    const { course_name, credits, status } = req.body;

    const updates = {};
    if (course_name !== undefined) updates.course_name = course_name;
    if (credits !== undefined) updates.credits = credits;
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('course_id', course_id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ message: 'Course updated successfully', course: data });
  } catch (error) {
    console.error('Update course error:', error);
    return res.status(500).json({ error: 'Failed to update course' });
  }
}

async function createAcademicYear(req, res) {
  try {
    const { academic_year } = req.body;

    if (!academic_year) {
      return res.status(400).json({ error: 'academic_year is required (e.g., "2026-2027")' });
    }

    const { data, error } = await supabase
      .from('academic_years')
      .insert({ academic_year })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Academic year created successfully',
      academic_year: data
    });
  } catch (error) {
    console.error('Create academic year error:', error);
    return res.status(500).json({ error: 'Failed to create academic year' });
  }
}

async function createBatch(req, res) {
  try {
    const { batch_name, start_year, end_year } = req.body;

    if (!batch_name || !start_year || !end_year) {
      return res.status(400).json({
        error: 'batch_name, start_year, and end_year are required'
      });
    }

    const { data, error } = await supabase
      .from('academic_batches')
      .insert({ batch_name, start_year, end_year })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ message: 'Batch created successfully', batch: data });
  } catch (error) {
    console.error('Create batch error:', error);
    return res.status(500).json({ error: 'Failed to create batch' });
  }
}

async function createWorkflowStage(req, res) {
  try {
    const { stage_name } = req.body;

    if (!stage_name) {
      return res.status(400).json({ error: 'stage_name is required' });
    }

    const { data, error } = await supabase
      .from('workflow_stage')
      .insert({ stage_name, is_open: false })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Workflow stage created successfully',
      stage: data
    });
  } catch (error) {
    console.error('Create workflow stage error:', error);
    return res.status(500).json({ error: 'Failed to create workflow stage' });
  }
}

module.exports = {
  getFaculty,
  createFaculty,
  updateFaculty,
  createFacultyDepartmentAssignment,
  getFacultyAssignments,
  createFacultyAssignment,
  createCourseSectionAssignments,
  deleteFacultyAssignment,
  getStudents,
  createStudent,
  updateStudent,
  getEnrollments,
  createEnrollment,
  deleteEnrollment,
  createSchool,
  updateSchool,
  createDepartment,
  updateDepartment,
  createCourse,
  updateCourse,
  createAcademicYear,
  createBatch,
  createWorkflowStage
};
