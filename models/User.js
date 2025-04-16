module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
      // Define user fields
      name: DataTypes.STRING,
      email: DataTypes.STRING,
      password: DataTypes.STRING,
      amount: {
        type: DataTypes.FLOAT,
      }
    });
  
    // Define associations
    User.associate = function(models) {
      // A user can have many transactions as the sender
      User.hasMany(models.Transaction, {
        foreignKey: 'senderId',
        as: 'sentTransactions', // Alias for the sender transactions
      });
  
      // A user can have many transactions as the receiver
      User.hasMany(models.Transaction, {
        foreignKey: 'receiverId',
        as: 'receivedTransactions', // Alias for the receiver transactions
      });
    };
  
    return User;
};
