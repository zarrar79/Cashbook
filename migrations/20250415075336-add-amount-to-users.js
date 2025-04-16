'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'amount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 10000,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'amount');
  },
};
