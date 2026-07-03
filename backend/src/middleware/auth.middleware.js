const supabase = require('../db/supabaseClient');
const { findOrSyncUser, getUserRoles, validateUserLogin } = require('../services/authSync');

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7);

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid or expired token'
      });
    }

    // Use authSync service to find or sync user
    const { user: dbUser, synced, error: syncError } = await findOrSyncUser(user.id, user.email);

    if (syncError || !dbUser) {
      return res.status(404).json({
        error: syncError || 'User not found in database. Please contact administrator to create your account.'
      });
    }

    // Validate user can login
    const { valid, error: validationError } = validateUserLogin(dbUser);

    if (!valid) {
      return res.status(403).json({
        error: validationError
      });
    }

    // Get user roles
    const { roles, error: rolesError } = await getUserRoles(dbUser.user_id);

    if (rolesError) {
      return res.status(500).json({
        error: 'Failed to fetch user roles'
      });
    }

    req.user = {
      ...dbUser,
      auth_user_id: user.id,
      roles
    };

    if (synced) {
      console.log(`✓ Auto-synced user ${dbUser.email} during authentication`);
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication failed'
    });
  }
}

module.exports = { authenticateToken };
