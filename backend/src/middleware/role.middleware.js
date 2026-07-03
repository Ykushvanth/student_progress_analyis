function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const userRoleNames = req.user.roles.map(r => r.role_name);
    const hasRequiredRole = allowedRoles.some(role =>
      userRoleNames.includes(role)
    );

    if (!hasRequiredRole) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRoleNames
      });
    }

    next();
  };
}

function requireAnyRole() {
  return (req, res, next) => {
    if (!req.user || !req.user.roles || req.user.roles.length === 0) {
      return res.status(403).json({
        error: 'No roles assigned to user'
      });
    }
    next();
  };
}

module.exports = {
  requireRole,
  requireAnyRole
};
