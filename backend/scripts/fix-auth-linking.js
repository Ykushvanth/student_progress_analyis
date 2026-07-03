/**
 * Fix Auth User ID Linking
 *
 * This script updates users.auth_user_id to match their Supabase Auth ID.
 * Run when you get "User not found in database" error on login.
 *
 * Usage: node scripts/fix-auth-linking.js <email>
 */

require('dotenv').config();
const supabase = require('../src/db/supabaseClient');

async function fixAuthLinking(email) {
  console.log(`🔧 Fixing auth linking for: ${email}\n`);

  try {
    // Step 1: Find user in database by email
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('user_id, employee_no, full_name, email, auth_user_id')
      .eq('email', email)
      .maybeSingle();

    if (dbError) throw dbError;

    if (!dbUser) {
      console.error(`❌ User with email ${email} not found in database.`);
      console.log('\n💡 Create the user first, then run this script.');
      process.exit(1);
    }

    console.log('✓ Found user in database:');
    console.log(`  Name: ${dbUser.full_name}`);
    console.log(`  Employee ID: ${dbUser.employee_no}`);
    console.log(`  Current auth_user_id: ${dbUser.auth_user_id || 'NULL'}`);

    // Step 2: Find user in Supabase Auth by email
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) throw authError;

    const authUser = authUsers.find(u => u.email === email);

    if (!authUser) {
      console.error(`\n❌ No Supabase Auth user found with email ${email}`);
      console.log('\n💡 Create the Supabase Auth user first:');
      console.log('   1. Go to Supabase Dashboard → Authentication → Users');
      console.log('   2. Click "Add User"');
      console.log(`   3. Email: ${email}`);
      console.log('   4. Set a password');
      console.log('   5. Run this script again');
      process.exit(1);
    }

    console.log(`\n✓ Found Supabase Auth user:`);
    console.log(`  Auth ID: ${authUser.id}`);
    console.log(`  Email: ${authUser.email}`);
    console.log(`  Created: ${authUser.created_at}`);

    // Step 3: Check if they match
    if (dbUser.auth_user_id === authUser.id) {
      console.log('\n✅ Already linked! Auth IDs match.');
      console.log('\nIf you still get 404 error, the issue is elsewhere.');
      process.exit(0);
    }

    // Step 4: Update database user with correct auth_user_id
    console.log('\n🔄 Updating users table...');

    const { error: updateError } = await supabase
      .from('users')
      .update({ auth_user_id: authUser.id })
      .eq('user_id', dbUser.user_id);

    if (updateError) throw updateError;

    console.log('✅ Successfully linked!');
    console.log(`\n📝 Summary:`);
    console.log(`   User: ${dbUser.full_name} (${dbUser.employee_no})`);
    console.log(`   Old auth_user_id: ${dbUser.auth_user_id || 'NULL'}`);
    console.log(`   New auth_user_id: ${authUser.id}`);
    console.log(`\n✨ You can now login with: ${email}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('\nUsage: node scripts/fix-auth-linking.js <email>');
  console.log('Example: node scripts/fix-auth-linking.js 99220041418@klu.ac.in');
  process.exit(1);
}

fixAuthLinking(email);
