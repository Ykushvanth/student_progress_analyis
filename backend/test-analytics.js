const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAnalytics() {
  console.log('=== Testing Analytics Data ===\n');

  // Check faculty_course_assignment count
  const { data: assignments, error: assignError } = await supabase
    .from('faculty_course_assignment')
    .select('assignment_id', { count: 'exact' });

  console.log('Faculty Course Assignments:', assignments?.length || 0);
  if (assignError) console.error('Assignment Error:', assignError);

  // Check faculty_effectiveness count
  const { data: effectiveness, error: effError } = await supabase
    .from('faculty_effectiveness')
    .select('*', { count: 'exact' });

  console.log('Faculty Effectiveness Records:', effectiveness?.length || 0);
  if (effError) console.error('Effectiveness Error:', effError);

  // Sample one assignment with details
  const { data: sample, error: sampleError } = await supabase
    .from('faculty_course_assignment')
    .select(`
      assignment_id,
      courses (course_code, course_name, department_id),
      users (full_name),
      academic_batches (batch_name)
    `)
    .limit(1);

  console.log('\nSample Assignment:', JSON.stringify(sample, null, 2));

  // Check if effectiveness exists for sample
  if (sample && sample.length > 0) {
    const { data: sampleEff } = await supabase
      .from('faculty_effectiveness')
      .select('*')
      .eq('assignment_id', sample[0].assignment_id);

    console.log('\nEffectiveness for sample:', JSON.stringify(sampleEff, null, 2));
  }
}

testAnalytics().then(() => process.exit(0));
