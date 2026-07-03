const supabase = require('../db/supabaseClient');
const effectivenessService = require('../services/effectiveness');

async function getAssignments(req, res) {
  try {
    const { academic_year_id, semester_id } = req.query;
    const facultyId = req.user.user_id;

    if (!academic_year_id || !semester_id) {
      return res.status(400).json({
        error: 'academic_year_id and semester_id are required'
      });
    }

    const { data, error } = await supabase
      .from('faculty_course_assignment')
      .select(`
        assignment_id,
        course_id,
        batch_id,
        section_id,
        courses (course_code, course_name, credits),
        academic_batches (batch_name),
        sections (section_name)
      `)
      .eq('faculty_id', facultyId)
      .eq('academic_year_id', academic_year_id)
      .eq('semester_id', semester_id);

    if (error) throw error;

    return res.status(200).json({ assignments: data || [] });
  } catch (error) {
    console.error('Get faculty assignments error:', error);
    return res.status(500).json({ error: 'Failed to fetch assignments' });
  }
}

async function getStudents(req, res) {
  try {
    const { assignment_id } = req.query;
    const facultyId = req.user.user_id;

    if (!assignment_id) {
      return res.status(400).json({ error: 'assignment_id is required' });
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from('faculty_course_assignment')
      .select('assignment_id, faculty_id')
      .eq('assignment_id', assignment_id)
      .single();

    if (assignmentError || !assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.faculty_id !== facultyId) {
      return res.status(403).json({ error: 'Not authorized for this assignment' });
    }

    const { data: enrollments, error: enrollmentError } = await supabase
      .from('student_course_enrollment')
      .select(`
        enrollment_id,
        student_id,
        students (
          student_id,
          register_no,
          student_name,
          email
        )
      `)
      .eq('assignment_id', assignment_id);

    if (enrollmentError) throw enrollmentError;

    const enrollmentIds = enrollments.map(e => e.enrollment_id);

    let performances = [];
    if (enrollmentIds.length > 0) {
      const { data: performanceData, error: performanceError } = await supabase
        .from('student_course_performance')
        .select('*')
        .in('enrollment_id', enrollmentIds);

      if (performanceError) throw performanceError;
      performances = performanceData || [];
    }

    const performanceMap = {};
    (performances || []).forEach(p => {
      performanceMap[p.enrollment_id] = p;
    });

    const students = enrollments.map(e => ({
      enrollment_id: e.enrollment_id,
      student_id: e.students.student_id,
      register_no: e.students.register_no,
      student_name: e.students.student_name,
      email: e.students.email,
      performance: performanceMap[e.enrollment_id] || null
    }));

    return res.status(200).json({ students });
  } catch (error) {
    console.error('Get students error:', error);
    return res.status(500).json({ error: 'Failed to fetch students' });
  }
}

async function addStudentToAssignment(req, res) {
  try {
    const { assignment_id } = req.params;
    const { register_no, student_name, email } = req.body;
    const facultyId = req.user.user_id;

    if (!register_no || !student_name) {
      return res.status(400).json({
        error: 'register_no and student_name are required'
      });
    }

    const normalizedRegisterNo = String(register_no).trim().toUpperCase();
    const normalizedStudentName = String(student_name).trim();
    const normalizedEmail = email ? String(email).trim() : null;

    if (!normalizedRegisterNo || !normalizedStudentName) {
      return res.status(400).json({
        error: 'register_no and student_name are required'
      });
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from('faculty_course_assignment')
      .select(`
        assignment_id,
        faculty_id,
        batch_id,
        section_id,
        courses!inner (department_id)
      `)
      .eq('assignment_id', assignment_id)
      .single();

    if (assignmentError || !assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.faculty_id !== facultyId) {
      return res.status(403).json({ error: 'Not authorized for this assignment' });
    }

    const departmentId = assignment.courses?.department_id;
    if (!departmentId) {
      return res.status(400).json({ error: 'Assignment course department could not be resolved' });
    }

    const { data: existingStudent, error: existingStudentError } = await supabase
      .from('students')
      .select('student_id, register_no, student_name, email, batch_id, department_id, section_id, status')
      .eq('register_no', normalizedRegisterNo)
      .maybeSingle();

    if (existingStudentError) throw existingStudentError;

    let student = existingStudent;

    if (student) {
      const matchesAssignment =
        student.batch_id === assignment.batch_id &&
        student.section_id === assignment.section_id &&
        student.department_id === departmentId;

      if (!matchesAssignment) {
        return res.status(400).json({
          error: 'Student already exists in another batch, section, or department. Contact Admin/IQAC to update the student record.'
        });
      }

      if (!student.status) {
        return res.status(400).json({
          error: 'Student exists but is inactive. Contact Admin/IQAC to reactivate the student.'
        });
      }
    } else {
      const { data: createdStudent, error: createStudentError } = await supabase
        .from('students')
        .insert({
          register_no: normalizedRegisterNo,
          student_name: normalizedStudentName,
          email: normalizedEmail,
          batch_id: assignment.batch_id,
          department_id: departmentId,
          section_id: assignment.section_id,
          status: true
        })
        .select('student_id, register_no, student_name, email, batch_id, department_id, section_id, status')
        .single();

      if (createStudentError) throw createStudentError;
      student = createdStudent;
    }

    const { data: existingEnrollment, error: existingEnrollmentError } = await supabase
      .from('student_course_enrollment')
      .select('enrollment_id')
      .eq('student_id', student.student_id)
      .eq('assignment_id', assignment_id)
      .maybeSingle();

    if (existingEnrollmentError) throw existingEnrollmentError;

    if (existingEnrollment) {
      return res.status(400).json({
        error: 'This student is already enrolled in this assignment'
      });
    }

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('student_course_enrollment')
      .insert({
        student_id: student.student_id,
        assignment_id
      })
      .select(`
        enrollment_id,
        student_id,
        assignment_id,
        students (student_id, register_no, student_name, email)
      `)
      .single();

    if (enrollmentError) throw enrollmentError;

    return res.status(201).json({
      message: 'Student added to assignment successfully',
      enrollment
    });
  } catch (error) {
    console.error('Add student to assignment error:', error);
    return res.status(500).json({ error: 'Failed to add student to assignment' });
  }
}

async function updateInitialAnalysis(req, res) {
  try {
    const { enrollment_id } = req.params;
    const { initial_analysis } = req.body;
    const facultyId = req.user.user_id;

    if (!['Slow Learner', 'Medium Learner', 'Fast Learner'].includes(initial_analysis)) {
      return res.status(400).json({
        error: 'Invalid initial_analysis value'
      });
    }

    const { data: stage, error: stageError } = await supabase
      .from('workflow_stage')
      .select('is_open')
      .eq('stage_name', 'Initial Analysis')
      .single();

    if (stageError || !stage || !stage.is_open) {
      return res.status(403).json({
        error: 'Initial Analysis stage is not open'
      });
    }

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('student_course_enrollment')
      .select(`
        enrollment_id,
        assignment_id,
        faculty_course_assignment (faculty_id)
      `)
      .eq('enrollment_id', enrollment_id)
      .single();

    if (enrollmentError || !enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    if (enrollment.faculty_course_assignment.faculty_id !== facultyId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { data: existing, error: existingError } = await supabase
      .from('student_course_performance')
      .select('performance_id')
      .eq('enrollment_id', enrollment_id)
      .maybeSingle();

    if (existingError) throw existingError;

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('student_course_performance')
        .update({
          initial_analysis,
          updated_by: facultyId,
          updated_at: new Date().toISOString()
        })
        .eq('performance_id', existing.performance_id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('student_course_performance')
        .insert({
          enrollment_id,
          initial_analysis,
          created_by: facultyId,
          updated_by: facultyId
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return res.status(200).json({ performance: result });
  } catch (error) {
    console.error('Update initial analysis error:', error);
    return res.status(500).json({ error: 'Failed to update initial analysis' });
  }
}

async function updateSessional1(req, res) {
  try {
    const { enrollment_id } = req.params;
    const { sessional1_marks } = req.body;
    const facultyId = req.user.user_id;

    if (sessional1_marks === undefined || sessional1_marks === null) {
      return res.status(400).json({ error: 'sessional1_marks is required' });
    }

    if (sessional1_marks < 0 || sessional1_marks > 100) {
      return res.status(400).json({ error: 'Marks must be between 0 and 100' });
    }

    const { data: stage, error: stageError } = await supabase
      .from('workflow_stage')
      .select('is_open')
      .eq('stage_name', 'Sessional 1')
      .single();

    if (stageError || !stage || !stage.is_open) {
      return res.status(403).json({ error: 'Sessional 1 stage is not open' });
    }

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('student_course_enrollment')
      .select(`
        enrollment_id,
        assignment_id,
        faculty_course_assignment (faculty_id)
      `)
      .eq('enrollment_id', enrollment_id)
      .single();

    if (enrollmentError || !enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    if (enrollment.faculty_course_assignment.faculty_id !== facultyId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { data: performance, error: performanceError } = await supabase
      .from('student_course_performance')
      .select('*')
      .eq('enrollment_id', enrollment_id)
      .maybeSingle();

    if (performanceError) throw performanceError;

    if (!performance || !performance.initial_analysis) {
      return res.status(400).json({
        error: 'Initial analysis must be set before entering sessional marks'
      });
    }

    const studentScores = effectivenessService.calculateStudentPerformanceScores({
      initial_analysis: performance.initial_analysis,
      sessional1_marks: parseFloat(sessional1_marks),
      sessional2_marks: performance.sessional2_marks
    });

    const { data: updated, error: updateError } = await supabase
      .from('student_course_performance')
      .update({
        sessional1_marks: parseFloat(sessional1_marks),
        p1_score: studentScores.p1_score,
        updated_by: facultyId,
        updated_at: new Date().toISOString()
      })
      .eq('performance_id', performance.performance_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.status(200).json({ performance: updated });
  } catch (error) {
    console.error('Update sessional1 error:', error);
    return res.status(500).json({ error: 'Failed to update sessional1 marks' });
  }
}

async function updateSessional2(req, res) {
  try {
    const { enrollment_id } = req.params;
    const { sessional2_marks } = req.body;
    const facultyId = req.user.user_id;

    if (sessional2_marks === undefined || sessional2_marks === null) {
      return res.status(400).json({ error: 'sessional2_marks is required' });
    }

    if (sessional2_marks < 0 || sessional2_marks > 100) {
      return res.status(400).json({ error: 'Marks must be between 0 and 100' });
    }

    const { data: stage, error: stageError } = await supabase
      .from('workflow_stage')
      .select('is_open')
      .eq('stage_name', 'Sessional 2')
      .single();

    if (stageError || !stage || !stage.is_open) {
      return res.status(403).json({ error: 'Sessional 2 stage is not open' });
    }

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('student_course_enrollment')
      .select(`
        enrollment_id,
        assignment_id,
        faculty_course_assignment (faculty_id)
      `)
      .eq('enrollment_id', enrollment_id)
      .single();

    if (enrollmentError || !enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    if (enrollment.faculty_course_assignment.faculty_id !== facultyId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { data: performance, error: performanceError } = await supabase
      .from('student_course_performance')
      .select('*')
      .eq('enrollment_id', enrollment_id)
      .maybeSingle();

    if (performanceError) throw performanceError;

    if (!performance || !performance.initial_analysis || !performance.sessional1_marks) {
      return res.status(400).json({
        error: 'Initial analysis and sessional1 marks must be set first'
      });
    }

    const studentScores = effectivenessService.calculateStudentPerformanceScores({
      initial_analysis: performance.initial_analysis,
      sessional1_marks: performance.sessional1_marks,
      sessional2_marks: parseFloat(sessional2_marks)
    });

    const { data: updated, error: updateError } = await supabase
      .from('student_course_performance')
      .update({
        sessional2_marks: parseFloat(sessional2_marks),
        p2_score: studentScores.p2_score,
        overall_score: studentScores.overall_score,
        updated_by: facultyId,
        updated_at: new Date().toISOString()
      })
      .eq('performance_id', performance.performance_id)
      .select()
      .single();

    if (updateError) throw updateError;

    const assignmentId = enrollment.assignment_id;

    const { data: allEnrollments, error: enrollmentsError } = await supabase
      .from('student_course_enrollment')
      .select(`
        enrollment_id,
        student_course_performance (
          initial_analysis,
          sessional1_marks,
          sessional2_marks
        )
      `)
      .eq('assignment_id', assignmentId);

    if (enrollmentsError) throw enrollmentsError;

    const studentsData = allEnrollments
      .filter(e => e.student_course_performance)
      .map(e => e.student_course_performance);

    const tecInputs = {
      avgCGPA: 6.0,
      courseComplexity: 2,
      teachingCount: 1,
      classSize: allEnrollments.length
    };

    const effectiveness = effectivenessService.calculateFacultyEffectiveness(
      studentsData,
      tecInputs
    );

    const { data: existingEffectiveness, error: existingError } = await supabase
      .from('faculty_effectiveness')
      .select('effectiveness_id')
      .eq('assignment_id', assignmentId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingEffectiveness) {
      await supabase
        .from('faculty_effectiveness')
        .update({
          p1: effectiveness.p1.ratio,
          p2: effectiveness.p2.ratio,
          tec: effectiveness.tec.score,
          effectiveness_score: effectiveness.effectiveness_score,
          rating: effectiveness.rating,
          calculated_on: new Date().toISOString()
        })
        .eq('effectiveness_id', existingEffectiveness.effectiveness_id);
    } else {
      await supabase
        .from('faculty_effectiveness')
        .insert({
          assignment_id: assignmentId,
          p1: effectiveness.p1.ratio,
          p2: effectiveness.p2.ratio,
          tec: effectiveness.tec.score,
          effectiveness_score: effectiveness.effectiveness_score,
          rating: effectiveness.rating
        });
    }

    return res.status(200).json({
      performance: updated,
      effectiveness
    });
  } catch (error) {
    console.error('Update sessional2 error:', error);
    return res.status(500).json({ error: 'Failed to update sessional2 marks' });
  }
}

async function addStudentsBulk(req, res) {
  try {
    const { assignment_id } = req.params;
    const { students } = req.body;
    const facultyId = req.user.user_id;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        error: 'students array is required and must not be empty'
      });
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from('faculty_course_assignment')
      .select(`
        assignment_id,
        faculty_id,
        batch_id,
        section_id,
        courses!inner (department_id)
      `)
      .eq('assignment_id', assignment_id)
      .single();

    if (assignmentError || !assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.faculty_id !== facultyId) {
      return res.status(403).json({ error: 'Not authorized for this assignment' });
    }

    const departmentId = assignment.courses?.department_id;
    if (!departmentId) {
      return res.status(400).json({ error: 'Assignment course department could not be resolved' });
    }

    const results = {
      success: [],
      errors: []
    };

    for (let i = 0; i < students.length; i++) {
      const { register_no, student_name, email } = students[i];

      try {
        if (!register_no || !student_name) {
          results.errors.push({
            row: i + 1,
            register_no,
            error: 'register_no and student_name are required'
          });
          continue;
        }

        const normalizedRegisterNo = String(register_no).trim().toUpperCase();
        const normalizedStudentName = String(student_name).trim();
        const normalizedEmail = email ? String(email).trim() : null;

        const { data: existingStudent } = await supabase
          .from('students')
          .select('student_id, register_no, student_name, batch_id, department_id, section_id, status')
          .eq('register_no', normalizedRegisterNo)
          .maybeSingle();

        let student = existingStudent;

        if (student) {
          const matchesAssignment =
            student.batch_id === assignment.batch_id &&
            student.section_id === assignment.section_id &&
            student.department_id === departmentId;

          if (!matchesAssignment) {
            results.errors.push({
              row: i + 1,
              register_no: normalizedRegisterNo,
              error: 'Student exists in different batch/section/department'
            });
            continue;
          }

          if (!student.status) {
            results.errors.push({
              row: i + 1,
              register_no: normalizedRegisterNo,
              error: 'Student is inactive'
            });
            continue;
          }
        } else {
          const { data: createdStudent, error: createError } = await supabase
            .from('students')
            .insert({
              register_no: normalizedRegisterNo,
              student_name: normalizedStudentName,
              email: normalizedEmail,
              batch_id: assignment.batch_id,
              department_id: departmentId,
              section_id: assignment.section_id,
              status: true
            })
            .select('student_id')
            .single();

          if (createError) {
            results.errors.push({
              row: i + 1,
              register_no: normalizedRegisterNo,
              error: createError.message
            });
            continue;
          }
          student = createdStudent;
        }

        const { data: existingEnrollment } = await supabase
          .from('student_course_enrollment')
          .select('enrollment_id')
          .eq('student_id', student.student_id)
          .eq('assignment_id', assignment_id)
          .maybeSingle();

        if (existingEnrollment) {
          results.errors.push({
            row: i + 1,
            register_no: normalizedRegisterNo,
            error: 'Already enrolled in this assignment'
          });
          continue;
        }

        const { error: enrollmentError } = await supabase
          .from('student_course_enrollment')
          .insert({
            student_id: student.student_id,
            assignment_id
          });

        if (enrollmentError) {
          results.errors.push({
            row: i + 1,
            register_no: normalizedRegisterNo,
            error: enrollmentError.message
          });
          continue;
        }

        results.success.push({
          row: i + 1,
          register_no: normalizedRegisterNo,
          student_name: normalizedStudentName
        });
      } catch (error) {
        results.errors.push({
          row: i + 1,
          register_no,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      message: `Processed ${students.length} students: ${results.success.length} added, ${results.errors.length} failed`,
      results
    });
  } catch (error) {
    console.error('Bulk add students error:', error);
    return res.status(500).json({ error: 'Failed to process bulk student add' });
  }
}

module.exports = {
  getAssignments,
  getStudents,
  addStudentToAssignment,
  addStudentsBulk,
  updateInitialAnalysis,
  updateSessional1,
  updateSessional2
};
