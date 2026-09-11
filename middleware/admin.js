// middleware/admin.js
const adminAuth = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    error: 'Accesso negato. Permessi amministratore richiesti.'
  });
};

const logAdminAction = (action) => {
  return (req, res, next) => {
    const adminId = req.user?.id || 'unknown';
    console.log(`🛡️ Admin ${adminId}: ${action}`);
    next();
  };
};

module.exports = { adminAuth, logAdminAction };