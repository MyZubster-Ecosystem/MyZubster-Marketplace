// models/index.js
require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// ===== CONNESSIONE AL DATABASE =====
const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'sqlite:./database.sqlite',
  {
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: process.env.DATABASE_URL ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {}
  }
);

// ===== IMPORT DEI MODELLI =====
const User = require('./User')(sequelize, DataTypes);
const Order = require('./Order')(sequelize, DataTypes);
const Skill = require('./Skill')(sequelize, DataTypes);

// ===== RELAZIONI =====

// ---- User ↔ Order ----
User.hasMany(Order, {
  foreignKey: 'buyerId',
  as: 'orders'
});
Order.belongsTo(User, {
  foreignKey: 'buyerId',
  as: 'buyer'
});

// ---- User ↔ Skill ----
User.hasMany(Skill, {
  foreignKey: 'sellerId',
  as: 'skills'
});
Skill.belongsTo(User, {
  foreignKey: 'sellerId',
  as: 'seller'
});

// ---- Order ↔ Skill ----
Order.belongsTo(Skill, {
  foreignKey: 'skillId',
  as: 'skill'
});
Skill.hasMany(Order, {
  foreignKey: 'skillId',
  as: 'orders'
});

// ===== ESPORTAZIONI =====
module.exports = {
  sequelize,
  Sequelize,
  User,
  Order,
  Skill
};