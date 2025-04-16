module.exports = (sequelize, DataTypes) => {
    const Notification = sequelize.define('Notification', {
      title: DataTypes.STRING,
      message: DataTypes.TEXT,
      isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    });
  
    Notification.associate = function(models) {
      Notification.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    };
  
    return Notification;
  };
  