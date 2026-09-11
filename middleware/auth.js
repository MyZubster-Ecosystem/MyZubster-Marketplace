const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwt');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token mancante' });
  }
  const [scheme, token] = authHeader.trim().split(/\s+/);
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token malformato' });
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token non valido' });
  }
};
