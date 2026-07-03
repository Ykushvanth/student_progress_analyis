const supabase = require('../db/supabaseClient');
const { findOrSyncUser, getUserRoles, validateUserLogin, createUserRecord } = require('../services/authSync');

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Use authSync service to find or sync user
    const { user: dbUser, synced, error: syncError } = await findOrSyncUser(data.user.id, data.user.email);

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

    if (synced) {
      console.log(`✓ Auto-synced user ${dbUser.email} during login`);
    }

    return res.status(200).json({
      user: {
        ...dbUser,
        roles
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Login failed'
    });
  }
}

async function getCurrentUser(req, res) {
  try {
    const userId = req.user.user_id;

    console.log('getCurrentUser - userId:', userId);
    console.log('getCurrentUser - req.user:', req.user);

    // Get user roles (already fetched in middleware, but refresh for scopes)
    const { roles, error: rolesError } = await getUserRoles(userId);

    console.log('getCurrentUser - roles:', roles);
    console.log('getCurrentUser - rolesError:', rolesError);

    if (rolesError) {
      console.error('Role fetch error:', rolesError);
      return res.status(500).json({
        error: 'Failed to fetch user roles',
        details: rolesError
      });
    }

    if (!roles || roles.length === 0) {
      console.warn('No roles found for user:', userId);
      return res.status(200).json({
        user: {
          ...req.user,
          roles: []
        },
        scopes: {}
      });
    }

    // Fetch role-specific scopes
    const roleScopes = {};

    for (const role of roles) {
      if (role.role_name === 'Dean') {
        const { data: deanAssignments } = await supabase
          .from('dean_assignment')
          .select('school_id, academic_year_id, schools(school_code, school_name)')
          .eq('user_id', userId)
          .eq('active', true);

        roleScopes.dean = deanAssignments || [];
      }

      if (role.role_name === 'HOD') {
        const { data: hodAssignments } = await supabase
          .from('hod_assignment')
          .select('department_id, academic_year_id, departments(department_code, department_name)')
          .eq('user_id', userId)
          .eq('active', true);

        roleScopes.hod = hodAssignments || [];
      }

      if (role.role_name === 'Faculty') {
        const { data: facultyAssignments } = await supabase
          .from('faculty_department_assignment')
          .select('department_id, academic_year_id, departments(department_code, department_name)')
          .eq('user_id', userId)
          .eq('active', true);

        roleScopes.faculty = facultyAssignments || [];
      }
    }

    return res.status(200).json({
      user: {
        ...req.user,
        roles
      },
      scopes: roleScopes
    });

  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve user profile'
    });
  }
}

async function register(req, res) {
  try {
    const { email, password, full_name, employee_no, phone } = req.body;

    // Validate required fields
    if (!email || !password || !full_name || !employee_no) {
      return res.status(400).json({
        error: 'Email, password, full name, and employee number are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long'
      });
    }

    // Check if employee number already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('employee_no')
      .eq('employee_no', employee_no)
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({
        error: 'Employee number already registered'
      });
    }

    // Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm email for internal registration
    });

    if (authError) {
      console.error('Supabase Auth error:', authError);
      return res.status(400).json({
        error: authError.message || 'Failed to create authentication account'
      });
    }

    // Create database user record
    const { user: dbUser, error: dbError } = await createUserRecord(
      authData.user.id,
      email,
      full_name,
      employee_no
    );

    if (dbError) {
      // Rollback: delete the auth user if database creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({
        error: 'Failed to create user record. Please try again.'
      });
    }

    // Add phone number if provided
    if (phone) {
      await supabase
        .from('users')
        .update({ phone })
        .eq('user_id', dbUser.user_id);
    }

    // Assign default Faculty role
    const { data: facultyRole } = await supabase
      .from('roles')
      .select('role_id')
      .eq('role_name', 'Faculty')
      .single();

    if (facultyRole) {
      await supabase
        .from('user_roles')
        .insert({
          user_id: dbUser.user_id,
          role_id: facultyRole.role_id
        });
      console.log(`✓ Assigned Faculty role to user: ${email}`);
    } else {
      console.warn('⚠ Faculty role not found in database - user created without role');
    }

    console.log(`✓ Successfully registered user: ${email}`);

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        user_id: dbUser.user_id,
        email: dbUser.email,
        full_name: dbUser.full_name,
        employee_no: dbUser.employee_no
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      error: 'Registration failed. Please try again.'
    });
  }
}

module.exports = {
  login,
  getCurrentUser,
  register
};
