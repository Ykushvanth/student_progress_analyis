/**
 * Create IQAC User
 *
 * Creates an IQAC user so you can login and manage the system.
 * Run with: node scripts/seed-iqac-user.js
 */

require('dotenv').config();
const supabase = require('../src/db/supabaseClient');

async function createIQACUser() {
  console.log('🔧 Creating IQAC user...\n');

  try {
    // Get IQAC role
    const { data: iqacRole } = await supabase
      .from('roles')
      .select('role_id')
      .eq('role_name', 'IQAC')
      .single();

    if (!iqacRole) {
      console.error('❌ IQAC role not found! Run seed-essential-data.js first.');
      process.exit(1);
    }

    // Check if IQAC user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id, employee_no, full_name')
      .eq('employee_no', 'IQAC001')
      .maybeSingle();

    if (existingUser) {
      console.log('✓ IQAC user already exists:');
      console.log(`  Name: ${existingUser.full_name}`);
      console.log(`  Employee ID: IQAC001`);
      console.log('\n✅ You can login with this user!');
      process.exit(0);
    }

    // Create IQAC user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        employee_no: 'IQAC001',
        full_name: 'IQAC Administrator',
        email: 'iqac@university.edu',
        is_active: true
      })
      .select()
      .single();

    if (userError) throw userError;

    console.log('✓ Created IQAC user:');
    console.log(`  Name: ${user.full_name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Employee ID: ${user.employee_no}`);

    // Assign IQAC role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.user_id,
        role_id: iqacRole.role_id
      });

    if (roleError) throw roleError;

    console.log('\n✅ IQAC user created successfully!');
    console.log('\n📝 IMPORTANT: Add this user to Supabase Auth:');
    console.log('   1. Go to Supabase Dashboard → Authentication → Users');
    console.log('   2. Click "Add User"');
    console.log(`   3. Email: iqac@university.edu`);
    console.log('   4. Generate a password or use: IqacAdmin2026');
    console.log('   5. The auth_user_id will be linked automatically on first login');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createIQACUser();
