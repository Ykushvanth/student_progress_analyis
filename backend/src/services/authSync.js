/**
 * Auth Synchronization Service
 *
 * Handles automatic user syncing between Supabase Auth and database.
 * Ensures auth_user_id is always correct and users can login seamlessly.
 */

const supabase = require('../db/supabaseClient');

/**
 * Find or sync user in database
 *
 * Strategy:
 * 1. Try exact auth_user_id match
 * 2. If not found, try email match
 * 3. If email match found, auto-sync the auth_user_id
 * 4. Return the synced user
 *
 * @param {string} authUserId - Supabase Auth user ID
 * @param {string} email - User email
 * @returns {Promise<{user: Object|null, synced: boolean, error: string|null}>}
 */
async function findOrSyncUser(authUserId, email) {
  try {
    // Step 1: Try exact auth_user_id match
    const { data: userByAuthId, error: authIdError } = await supabase
      .from('users')
      .select('user_id, employee_no, full_name, email, is_active, auth_user_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (authIdError) {
      console.error('Error querying by auth_user_id:', authIdError);
      return { user: null, synced: false, error: authIdError.message };
    }

    if (userByAuthId) {
      console.log(`✓ User found by auth_user_id: ${userByAuthId.email}`);
      return { user: userByAuthId, synced: false, error: null };
    }

    // Step 2: Try email match (fallback)
    console.log(`No user found by auth_user_id. Trying email: ${email}`);

    const { data: userByEmail, error: emailError } = await supabase
      .from('users')
      .select('user_id, employee_no, full_name, email, is_active, auth_user_id')
      .eq('email', email)
      .maybeSingle();

    if (emailError) {
      console.error('Error querying by email:', emailError);
      return { user: null, synced: false, error: emailError.message };
    }

    if (!userByEmail) {
      console.log(`✗ No user found in database with email: ${email}`);
      return {
        user: null,
        synced: false,
        error: `No user record found for ${email}. User must be created in the database first.`
      };
    }

    // Step 3: User found by email but auth_user_id doesn't match - AUTO-SYNC!
    console.log(`✓ User found by email: ${userByEmail.email}`);
    console.log(`  Current auth_user_id: ${userByEmail.auth_user_id}`);
    console.log(`  Expected auth_user_id: ${authUserId}`);
    console.log(`  → Auto-syncing...`);

    const { data: syncedUser, error: syncError } = await supabase
      .from('users')
      .update({ auth_user_id: authUserId })
      .eq('user_id', userByEmail.user_id)
      .select('user_id, employee_no, full_name, email, is_active, auth_user_id')
      .single();

    if (syncError) {
      console.error('Error syncing auth_user_id:', syncError);
      return { user: null, synced: false, error: syncError.message };
    }

    console.log(`✓ Successfully synced auth_user_id for ${syncedUser.email}`);
    return { user: syncedUser, synced: true, error: null };

  } catch (error) {
    console.error('Unexpected error in findOrSyncUser:', error);
    return { user: null, synced: false, error: error.message };
  }
}

/**
 * Get user with roles
 *
 * @param {number} userId - Database user ID
 * @returns {Promise<{roles: Array, error: string|null}>}
 */
async function getUserRoles(userId) {
  try {
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles (role_id, role_name)
      `)
      .eq('user_id', userId);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return { roles: [], error: rolesError.message };
    }

    const roles = (userRoles || []).map(ur => ({
      role_id: ur.roles.role_id,
      role_name: ur.roles.role_name
    }));

    return { roles, error: null };

  } catch (error) {
    console.error('Unexpected error in getUserRoles:', error);
    return { roles: [], error: error.message };
  }
}

/**
 * Validate user can login
 *
 * @param {Object} user - User object from database
 * @returns {{valid: boolean, error: string|null}}
 */
function validateUserLogin(user) {
  if (!user) {
    return {
      valid: false,
      error: 'User not found'
    };
  }

  if (!user.is_active) {
    return {
      valid: false,
      error: 'User account is inactive. Please contact your administrator.'
    };
  }

  return { valid: true, error: null };
}

/**
 * Create user record from Supabase Auth user
 * (For future registration flow)
 *
 * @param {string} authUserId - Supabase Auth user ID
 * @param {string} email - User email
 * @param {string} fullName - User full name
 * @param {string} employeeNo - Employee number
 * @returns {Promise<{user: Object|null, error: string|null}>}
 */
async function createUserRecord(authUserId, email, fullName, employeeNo) {
  try {
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        auth_user_id: authUserId,
        email,
        full_name: fullName,
        employee_no: employeeNo,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user record:', error);
      return { user: null, error: error.message };
    }

    console.log(`✓ Created user record for ${email}`);
    return { user: newUser, error: null };

  } catch (error) {
    console.error('Unexpected error in createUserRecord:', error);
    return { user: null, error: error.message };
  }
}

module.exports = {
  findOrSyncUser,
  getUserRoles,
  validateUserLogin,
  createUserRecord
};
