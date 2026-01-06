const sequelize = require('../config/database');
const Employee = require('./Employee');
const Attendance = require('./Attendance');

// Associations
Employee.hasMany(Attendance, { foreignKey: 'employeeId' });
Attendance.belongsTo(Employee, { foreignKey: 'employeeId' });

module.exports = {
    sequelize,
    Employee,
    Attendance
};
