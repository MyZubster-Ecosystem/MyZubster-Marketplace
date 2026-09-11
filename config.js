// config.js
require('dotenv').config();

module.exports = {
  MYZUBSTER_API_URL: process.env.MYZUBSTER_API_URL || 'http://localhost:3000/api',
  MYZUBSTER_API_TOKEN: process.env.MYZUBSTER_API_TOKEN || null,
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development'
};