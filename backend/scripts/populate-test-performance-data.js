/**
 * Populate Test Performance Data
 *
 * This script populates student_course_performance with sample data
 * and calculates faculty_effectiveness so IQAC can view analytics.
 *
 * Run with: node scripts/populate-test-performance-data.js
 */

require('dotenv').config();
const supabase = require('../src/db/supabaseClient');
const effectivenessService = require('../src/services/effectiveness');

// Helper to generate random marks within a range
function randomMarks(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper to randomly assign initial analysis based on realistic distribution
function randomInitialAnalysis() {
  const rand = Math.random();
  if (rand < 0.2) return 'Slow Learner';
  if (rand < 0.7) return 'Medium Learner';
  return 'Fast Learner';
}

// Helper to generate sessional marks based on initial analysis
function generateSessionalMarks(initialAnalysis) {
  let sess1, sess2;

  switch(initialAnalysis) {
    case 'Slow Learner':
      sess1 = randomMarks(30, 55);
      sess2 = sess1 + randomMarks(5, 15); // Some improvement
      break;
    case 'Medium Learner':
      sess1 = randomMarks(50, 75);
      sess2 = sess1 + randomMarks(0, 12);
      break;
    case 'Fast Learner':
      sess1 = randomMarks(70, 95);
      sess2 = sess1 + randomMarks(-5, 5); // Already high, small variance
      break;
    default:
      sess1 = randomMarks(40, 80);
      sess2 = sess1 + randomMarks(0, 10);
  }

  // Ensure marks stay within 0-100 range
  sess2 = Math.min(Math.max(sess2, 0), 100);

  return { sessional1_marks: sess1, sessional2_marks: sess2 };
}

async function populateTestData() {
  console.log('🚀 Starting test data population...\n');

  try {
    // Step 1: Get all faculty_course_assignments
    console.log('📋 Step 1: Fetching faculty course assignments...');
    const { data: assignments, error: assignmentsError } = await supabase
      .from('faculty_course_assignment')
      .select('assignment_id, faculty_id, course_id, batch_id, section_id');

    if (assignmentsError) throw assignmentsError;

    if (!assignments || assignments.length === 0) {
      console.log('⚠️  No faculty course assignments found. Please seed master data first.');
      return;
    }

    console.log(`   Found ${assignments.length} assignments\n`);

    // Step 2: Process each assignment
    for (const assignment of assignments) {
      console.log(`📚 Processing assignment ${assignment.assignment_id}...`);

      // Get enrolled students for this assignment
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('student_course_enrollment')
        .select('enrollment_id, student_id')
        .eq('assignment_id', assignment.assignment_id);

      if (enrollmentsError) throw enrollmentsError;

      if (!enrollments || enrollments.length === 0) {
        console.log(`   ⚠️  No enrollments found for assignment ${assignment.assignment_id}`);
        continue;
      }

      console.log(`   Found ${enrollments.length} enrolled students`);

      // Step 3: Add performance data for each enrolled student
      const performanceUpdates = [];

      for (const enrollment of enrollments) {
        const initialAnalysis = randomInitialAnalysis();
        const { sessional1_marks, sessional2_marks } = generateSessionalMarks(initialAnalysis);

        const studentScores = effectivenessService.calculateStudentPerformanceScores({
          initial_analysis: initialAnalysis,
          sessional1_marks,
          sessional2_marks
        });

        // Check if performance record already exists
        const { data: existing } = await supabase
          .from('student_course_performance')
          .select('performance_id')
          .eq('enrollment_id', enrollment.enrollment_id)
          .maybeSingle();

        if (existing) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('student_course_performance')
            .update({
              initial_analysis: initialAnalysis,
              sessional1_marks,
              sessional2_marks,
              p1_score: studentScores.p1_score,
              p2_score: studentScores.p2_score,
              overall_score: studentScores.overall_score,
              updated_at: new Date().toISOString()
            })
            .eq('performance_id', existing.performance_id);

          if (updateError) {
            console.log(`   ⚠️  Failed to update performance for enrollment ${enrollment.enrollment_id}:`, updateError.message);
          }
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('student_course_performance')
            .insert({
              enrollment_id: enrollment.enrollment_id,
              initial_analysis: initialAnalysis,
              sessional1_marks,
              sessional2_marks,
              p1_score: studentScores.p1_score,
              p2_score: studentScores.p2_score,
              overall_score: studentScores.overall_score,
              remarks: 'Test data',
              created_by: assignment.faculty_id,
              updated_by: assignment.faculty_id
            });

          if (insertError) {
            console.log(`   ⚠️  Failed to insert performance for enrollment ${enrollment.enrollment_id}:`, insertError.message);
          }
        }

        performanceUpdates.push({
          initial_analysis: initialAnalysis,
          sessional1_marks,
          sessional2_marks
        });
      }

      console.log(`   ✅ Updated ${performanceUpdates.length} student performance records`);

      // Step 4: Calculate and save faculty effectiveness for this assignment
      console.log(`   📊 Calculating faculty effectiveness...`);

      const tecInputs = {
        avgCGPA: 6.0 + (Math.random() - 0.5), // Random around 6.0
        courseComplexity: Math.floor(Math.random() * 3) + 1, // 1-3
        teachingCount: Math.floor(Math.random() * 3) + 1, // 1-3
        classSize: enrollments.length
      };

      const effectiveness = effectivenessService.calculateFacultyEffectiveness(
        performanceUpdates,
        tecInputs
      );

      // Check if effectiveness record exists
      const { data: existingEffectiveness } = await supabase
        .from('faculty_effectiveness')
        .select('effectiveness_id')
        .eq('assignment_id', assignment.assignment_id)
        .maybeSingle();

      if (existingEffectiveness) {
        // Update existing
        const { error: updateEffError } = await supabase
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

        if (updateEffError) throw updateEffError;
      } else {
        // Insert new
        const { error: insertEffError } = await supabase
          .from('faculty_effectiveness')
          .insert({
            assignment_id: assignment.assignment_id,
            p1: effectiveness.p1.ratio,
            p2: effectiveness.p2.ratio,
            tec: effectiveness.tec.score,
            effectiveness_score: effectiveness.effectiveness_score,
            rating: effectiveness.rating
          });

        if (insertEffError) throw insertEffError;
      }

      console.log(`   ✅ Faculty effectiveness: ${effectiveness.rating} (Score: ${effectiveness.effectiveness_score})`);
      console.log(`      P1: ${effectiveness.p1.ratio.toFixed(2)}, P2: ${effectiveness.p2.ratio.toFixed(2)}, TEC: ${effectiveness.tec.score}\n`);
    }

    console.log('✨ Test data population completed successfully!');
    console.log('\n📈 IQAC can now view analytics in the dashboard.');

  } catch (error) {
    console.error('❌ Error populating test data:', error);
    throw error;
  }
}

// Run the script
populateTestData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
