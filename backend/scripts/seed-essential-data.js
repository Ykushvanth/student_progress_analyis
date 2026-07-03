/**
 * Seed Essential Data
 *
 * Populates the database with minimal data needed for Dr. Priya Sharma
 * to see course assignments in the Faculty Dashboard.
 *
 * Run with: node scripts/seed-essential-data.js
 */

require('dotenv').config();
const supabase = require('../src/db/supabaseClient');

async function seedEssentialData() {
  console.log('🌱 Starting essential data seeding...\n');

  try {
    // ========================================================================
    // 1. ROLES
    // ========================================================================
    console.log('📋 Step 1: Creating roles...');
    const roles = ['Admin', 'IQAC', 'Dean', 'HOD', 'Faculty'];

    for (const roleName of roles) {
      const { data: existing } = await supabase
        .from('roles')
        .select('role_id')
        .eq('role_name', roleName)
        .maybeSingle();

      if (!existing) {
        await supabase.from('roles').insert({ role_name: roleName });
        console.log(`   ✓ Created role: ${roleName}`);
      } else {
        console.log(`   • Role already exists: ${roleName}`);
      }
    }

    // ========================================================================
    // 2. WORKFLOW STAGES
    // ========================================================================
    console.log('\n📋 Step 2: Creating workflow stages...');
    const stages = ['Initial Analysis', 'Sessional 1', 'Sessional 2'];

    for (const stageName of stages) {
      const { data: existing } = await supabase
        .from('workflow_stage')
        .select('stage_id')
        .eq('stage_name', stageName)
        .maybeSingle();

      if (!existing) {
        await supabase.from('workflow_stage').insert({
          stage_name: stageName,
          is_open: false
        });
        console.log(`   ✓ Created stage: ${stageName}`);
      } else {
        console.log(`   • Stage already exists: ${stageName}`);
      }
    }

    // ========================================================================
    // 3. SECTIONS
    // ========================================================================
    console.log('\n📋 Step 3: Creating sections...');
    const sections = ['A', 'B', 'C'];

    for (const sectionName of sections) {
      const { data: existing } = await supabase
        .from('sections')
        .select('section_id')
        .eq('section_name', sectionName)
        .maybeSingle();

      if (!existing) {
        await supabase.from('sections').insert({ section_name: sectionName });
        console.log(`   ✓ Created section: ${sectionName}`);
      } else {
        console.log(`   • Section already exists: ${sectionName}`);
      }
    }

    // ========================================================================
    // 4. SEMESTERS
    // ========================================================================
    console.log('\n📋 Step 4: Creating semesters...');
    const semesters = [
      { semester_name: 'Semester 1', semester_type: 'Odd' },
      { semester_name: 'Semester 2', semester_type: 'Even' },
      { semester_name: 'Semester 3', semester_type: 'Odd' },
      { semester_name: 'Semester 4', semester_type: 'Even' },
      { semester_name: 'Semester 5', semester_type: 'Odd' },
      { semester_name: 'Semester 6', semester_type: 'Even' },
      { semester_name: 'Semester 7', semester_type: 'Odd' },
      { semester_name: 'Semester 8', semester_type: 'Even' }
    ];

    for (const sem of semesters) {
      const { data: existing } = await supabase
        .from('semesters')
        .select('semester_id')
        .eq('semester_name', sem.semester_name)
        .maybeSingle();

      if (!existing) {
        await supabase.from('semesters').insert(sem);
        console.log(`   ✓ Created: ${sem.semester_name} (${sem.semester_type})`);
      } else {
        console.log(`   • Already exists: ${sem.semester_name}`);
      }
    }

    // ========================================================================
    // 5. SCHOOL
    // ========================================================================
    console.log('\n📋 Step 5: Creating school...');
    let schoolId;
    const { data: existingSchool } = await supabase
      .from('schools')
      .select('school_id')
      .eq('school_code', 'SOE')
      .maybeSingle();

    if (!existingSchool) {
      const { data: school } = await supabase
        .from('schools')
        .insert({
          school_code: 'SOE',
          school_name: 'School of Engineering',
          status: true
        })
        .select()
        .single();
      schoolId = school.school_id;
      console.log(`   ✓ Created: School of Engineering (SOE)`);
    } else {
      schoolId = existingSchool.school_id;
      console.log(`   • School already exists: SOE`);
    }

    // ========================================================================
    // 6. DEPARTMENT
    // ========================================================================
    console.log('\n📋 Step 6: Creating department...');
    let departmentId;
    const { data: existingDept } = await supabase
      .from('departments')
      .select('department_id')
      .eq('department_code', 'CSE')
      .maybeSingle();

    if (!existingDept) {
      const { data: dept } = await supabase
        .from('departments')
        .insert({
          school_id: schoolId,
          department_code: 'CSE',
          department_name: 'Computer Science and Engineering',
          status: true
        })
        .select()
        .single();
      departmentId = dept.department_id;
      console.log(`   ✓ Created: Computer Science and Engineering (CSE)`);
    } else {
      departmentId = existingDept.department_id;
      console.log(`   • Department already exists: CSE`);
    }

    // ========================================================================
    // 7. ACADEMIC YEAR
    // ========================================================================
    console.log('\n📋 Step 7: Creating academic year...');
    let academicYearId;
    const { data: existingYear } = await supabase
      .from('academic_years')
      .select('academic_year_id')
      .eq('academic_year', '2026-2027')
      .maybeSingle();

    if (!existingYear) {
      const { data: year } = await supabase
        .from('academic_years')
        .insert({ academic_year: '2026-2027' })
        .select()
        .single();
      academicYearId = year.academic_year_id;
      console.log(`   ✓ Created: 2026-2027`);
    } else {
      academicYearId = existingYear.academic_year_id;
      console.log(`   • Academic year already exists: 2026-2027`);
    }

    // ========================================================================
    // 8. BATCH
    // ========================================================================
    console.log('\n📋 Step 8: Creating batch...');
    let batchId;
    const { data: existingBatch } = await supabase
      .from('academic_batches')
      .select('batch_id')
      .eq('batch_name', '2023-2027')
      .maybeSingle();

    if (!existingBatch) {
      const { data: batch } = await supabase
        .from('academic_batches')
        .insert({
          batch_name: '2023-2027',
          start_year: 2023,
          end_year: 2027
        })
        .select()
        .single();
      batchId = batch.batch_id;
      console.log(`   ✓ Created batch: 2023-2027`);
    } else {
      batchId = existingBatch.batch_id;
      console.log(`   • Batch already exists: 2023-2027`);
    }

    // Get section and semester IDs for later use
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

    console.log('\n✨ Essential data seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - School ID: ${schoolId}`);
    console.log(`   - Department ID (CSE): ${departmentId}`);
    console.log(`   - Academic Year ID (2026-2027): ${academicYearId}`);
    console.log(`   - Batch ID (2023-2027): ${batchId}`);
    console.log(`   - Section A ID: ${sectionA.section_id}`);
    console.log(`   - Semester 1 ID: ${semester1.semester_id}`);

    return {
      schoolId,
      departmentId,
      academicYearId,
      batchId,
      sectionId: sectionA.section_id,
      semesterId: semester1.semester_id
    };

  } catch (error) {
    console.error('❌ Error seeding essential data:', error);
    throw error;
  }
}

// Run the script
seedEssentialData()
  .then((ids) => {
    console.log('\n✅ Script completed successfully');
    console.log('\n💡 Next steps:');
    console.log('   1. Use the IQAC admin API to create:');
    console.log('      - Courses');
    console.log('      - Faculty users (including Dr. Priya Sharma)');
    console.log('      - Faculty course assignments');
    console.log('      - Students');
    console.log('      - Student enrollments');
    console.log('\n   2. Or run the extended seed script (if available)');
    console.log('\n   API endpoints available at:');
    console.log('   POST http://localhost:5000/api/iqac/admin/courses');
    console.log('   POST http://localhost:5000/api/iqac/admin/faculty');
    console.log('   POST http://localhost:5000/api/iqac/admin/faculty-assignments');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
