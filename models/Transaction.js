module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
    type: { type: DataTypes.ENUM('send', 'receive'), allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
  });

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.User, {
      as: 'sender',
      foreignKey: 'senderId',
    });
    Transaction.belongsTo(models.User, {
      as: 'receiver',
      foreignKey: 'receiverId',
    });
  };

  return Transaction;
};
