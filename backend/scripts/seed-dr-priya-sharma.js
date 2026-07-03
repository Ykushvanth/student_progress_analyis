/**
 * Seed Dr. Priya Sharma Data
 *
 * Creates Dr. Priya Sharma (SOED001) as faculty with course assignments
 * for the 2026-2027 academic year, Semester 1.
 *
 * Prerequisites: Run seed-essential-data.js first
 * Run with: node scripts/seed-dr-priya-sharma.js
 */

require('dotenv').config();
const supabase = require('../src/db/supabaseClient');

async function seedDrPriyaSharma() {
  console.log('🌱 Setting up Dr. Priya Sharma...\n');

  try {
    // Get essential IDs
    console.log('📋 Step 1: Fetching essential IDs...');

    const { data: dept } = await supabase
      .from('departments')
      .select('department_id')
      .eq('department_code', 'CSE')
      .single();

    const { data: academicYear } = await supabase
      .from('academic_years')
      .select('academic_year_id')
      .eq('academic_year', '2026-2027')
      .single();

    const { data: batch } = await supabase
      .from('academic_batches')
      .select('batch_id')
      .eq('batch_name', '2023-2027')
      .single();

    const { data: sectionA } = await supabase
      .from('sections')
      .select('section_id')
      .eq('section_name', 'A')
      .single();

    const { data: semester1 } = await supabase
      .from('semesters')
      .select('semester_id')
      .eq('semester_name', 'Semester 1')
      .single();

    const { data: facultyRole } = await supabase
      .from('roles')
      .select('role_id')
      .eq('role_name', 'Faculty')
      .single();

    console.log('   ✓ Retrieved all essential IDs');

    // ========================================================================
    // 2. CREATE COURSES
    // ========================================================================
    console.log('\n📚 Step 2: Creating courses...');

    const courses = [
      { code: 'CS301', name: 'Database Management Systems', year: 3, credits: 4.0 },
      { code: 'CS302', name: 'Software Engineering', year: 3, credits: 3.0 },
      { code: 'CS303', name: 'Computer Networks', year: 3, credits: 4.0 }
    ];

    const courseIds = [];

    for (const course of courses) {
      const { data: existing } = await supabase
        .from('courses')
        .select('course_id')
        .eq('course_code', course.code)
        .maybeSingle();

      if (!existing) {
        const { data: newCourse } = await supabase
          .from('courses')
          .insert({
            course_code: course.code,
            course_name: course.name,
            department_id: dept.department_id,
            year_of_study: course.year,
            credits: course.credits,
            status: true
          })
          .select()
          .single();

        courseIds.push({ ...course, course_id: newCourse.course_id });
        console.log(`   ✓ Created: ${course.code} - ${course.name}`);
      } else {
        courseIds.push({ ...course, course_id: existing.course_id });
        console.log(`   • Already exists: ${course.code}`);
      }
    }

    // ========================================================================
    // 3. CREATE DR. PRIYA SHARMA
    // ========================================================================
    console.log('\n👩‍🏫 Step 3: Creating Dr. Priya Sharma...');

    let facultyId;
    const { data: existingFaculty } = await supabase
      .from('users')
      .select('user_id')
      .eq('employee_no', 'SOED001')
      .maybeSingle();

    if (!existingFaculty) {
      const { data: faculty } = await supabase
        .from('users')
        .insert({
          employee_no: 'SOED001',
          full_name: 'Dr. Priya Sharma',
          email: 'priya.sharma@university.edu',
          phone: '+91-9876543210',
          is_active: true
        })
        .select()
        .single();

      facultyId = faculty.user_id;
      console.log(`   ✓ Created: Dr. Priya Sharma (SOED001)`);

      // Assign Faculty role
      await supabase
        .from('user_roles')
        .insert({
          user_id: facultyId,
          role_id: facultyRole.role_id
        });
      console.log(`   ✓ Assigned Faculty role`);

      // Assign to department
      await supabase
        .from('faculty_department_assignment')
        .insert({
          user_id: facultyId,
          department_id: dept.department_id,
          academic_year_id: academicYear.academic_year_id,
          active: true
        });
      console.log(`   ✓ Assigned to CSE department for 2026-2027`);

    } else {
      facultyId = existingFaculty.user_id;
      console.log(`   • Dr. Priya Sharma already exists (ID: ${facultyId})`);
    }

    // ========================================================================
    // 4. CREATE FACULTY COURSE ASSIGNMENTS
    // ========================================================================
    console.log('\n📝 Step 4: Creating course assignments...');

    const assignmentIds = [];

    for (const course of courseIds) {
      const { data: existing } = await supabase
        .from('faculty_course_assignment')
        .select('assignment_id')
        .eq('faculty_id', facultyId)
        .eq('course_id', course.course_id)
        .eq('batch_id', batch.batch_id)
        .eq('section_id', sectionA.section_id)
        .eq('academic_year_id', academicYear.academic_year_id)
        .eq('semester_id', semester1.semester_id)
        .maybeSingle();

      if (!existing) {
        const { data: assignment } = await supabase
          .from('faculty_course_assignment')
          .insert({
            faculty_id: facultyId,
            course_id: course.course_id,
            batch_id: batch.batch_id,
            section_id: sectionA.section_id,
            academic_year_id: academicYear.academic_year_id,
            semester_id: semester1.semester_id
          })
          .select()
          .single();

        assignmentIds.push({ course: course.code, assignment_id: assignment.assignment_id });
        console.log(`   ✓ Assigned: ${course.code} - Section A`);
      } else {
        assignmentIds.push({ course: course.code, assignment_id: existing.assignment_id });
        console.log(`   • Already assigned: ${course.code}`);
      }
    }

    // ========================================================================
    // 5. CREATE STUDENTS
    // ========================================================================
    console.log('\n👥 Step 5: Creating sample students...');

    const students = [
      { regno: '23CSE001', name: 'Rahul Kumar' },
      { regno: '23CSE002', name: 'Priya Patel' },
      { regno: '23CSE003', name: 'Amit Singh' },
      { regno: '23CSE004', name: 'Sneha Reddy' },
      { regno: '23CSE005', name: 'Vikram Sharma' }
    ];

    const studentIds = [];

    for (const student of students) {
      const { data: existing } = await supabase
        .from('students')
        .select('student_id')
        .eq('register_no', student.regno)
        .maybeSingle();

      if (!existing) {
        const { data: newStudent } = await supabase
          .from('students')
          .insert({
            register_no: student.regno,
            student_name: student.name,
            batch_id: batch.batch_id,
            department_id: dept.department_id,
            section_id: sectionA.section_id,
            email: `${student.regno.toLowerCase()}@student.edu`,
            status: true
          })
          .select()
          .single();

        studentIds.push({ ...student, student_id: newStudent.student_id });
        console.log(`   ✓ Created: ${student.regno} - ${student.name}`);
      } else {
        studentIds.push({ ...student, student_id: existing.student_id });
        console.log(`   • Already exists: ${student.regno}`);
      }
    }

    // ========================================================================
    // 6. CREATE ENROLLMENTS
    // ========================================================================
    console.log('\n📚 Step 6: Enrolling students in courses...');

    let enrollmentCount = 0;
    for (const assignment of assignmentIds) {
      for (const student of studentIds) {
        const { data: existing } = await supabase
          .from('student_course_enrollment')
          .select('enrollment_id')
          .eq('student_id', student.student_id)
          .eq('assignment_id', assignment.assignment_id)
          .maybeSingle();

        if (!existing) {
          await supabase
            .from('student_course_enrollment')
            .insert({
              student_id: student.student_id,
              assignment_id: assignment.assignment_id
            });
          enrollmentCount++;
        }
      }
    }

    console.log(`   ✓ Created ${enrollmentCount} enrollments`);

    console.log('\n✨ Dr. Priya Sharma setup completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Faculty: Dr. Priya Sharma (SOED001)`);
    console.log(`   - Department: Computer Science and Engineering`);
    console.log(`   - Academic Year: 2026-2027`);
    console.log(`   - Semester: Semester 1 (Odd)`);
    console.log(`   - Courses Assigned: ${courseIds.length}`);
    courseIds.forEach(c => console.log(`     • ${c.code} - ${c.name}`));
    console.log(`   - Students: ${studentIds.length}`);
    console.log(`   - Total Enrollments: ${enrollmentCount}`);

  } catch (error) {
    console.error('❌ Error setting up Dr. Priya Sharma:', error);
    throw error;
  }
}

// Run the script
seedDrPriyaSharma()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    console.log('\n🎯 Next steps:');
    console.log('   1. Start the backend: npm run dev');
    console.log('   2. Login as Dr. Priya Sharma');
    console.log('   3. Select Academic Year: 2026-2027');
    console.log('   4. Select Semester: Semester 1 (Odd)');
    console.log('   5. View assigned courses and students!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
