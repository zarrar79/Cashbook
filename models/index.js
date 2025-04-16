const { Sequelize, DataTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Initialize sequelize
const sequelize = new Sequelize('cashbook', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
});

const db = {};

// Load all models and attach to db
fs.readdirSync(__dirname)
  .filter(file => file !== 'index.js' && file.endsWith('.js'))
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

// Run associations if defined
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
