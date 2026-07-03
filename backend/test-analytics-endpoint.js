const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testEndpointLogic() {
  console.log('=== Testing Analytics Endpoint Logic ===\n');

  // Simulate the endpoint with NO filters (what happens when user clicks "Load Analytics" with empty filters)
  const school_id = undefined;
  const department_id = undefined;
  const batch_id = undefined;
  const academic_year_id = undefined;
  const semester_id = undefined;
  const course_id = undefined;

  console.log('Test 1: No filters (should return all data)');
  let courseIds = null;

  if (school_id || department_id) {
    console.log('Filtering by school/department...');
  } else {
    console.log('No school/department filter - will query all assignments');
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

  if (courseIds) {
    query = query.in('course_id', courseIds);
  }
  if (course_id) query = query.eq('course_id', course_id);
  if (batch_id) query = query.eq('batch_id', batch_id);
  if (academic_year_id) query = query.eq('academic_year_id', academic_year_id);
  if (semester_id) query = query.eq('semester_id', semester_id);

  console.log('Querying faculty_course_assignment...');
  const { data: assignments, error: assignmentsError } = await query;

  if (assignmentsError) {
    console.error('ERROR:', assignmentsError);
    return;
  }

  console.log(`Found ${assignments.length} assignments`);

  if (assignments.length > 0) {
    const assignmentIds = assignments.map(a => a.assignment_id);
    console.log('Querying effectiveness for assignment IDs:', assignmentIds.slice(0, 5), '...');

    const { data: effectiveness, error: effectivenessError } = await supabase
      .from('faculty_effectiveness')
      .select('*')
      .in('assignment_id', assignmentIds);

    if (effectivenessError) {
      console.error('Effectiveness ERROR:', effectivenessError);
      return;
    }

    console.log(`Found ${effectiveness.length} effectiveness records`);
    console.log('\nSample result:');
    console.log(JSON.stringify(assignments[0], null, 2));
  }
}

testEndpointLogic().then(() => process.exit(0));
