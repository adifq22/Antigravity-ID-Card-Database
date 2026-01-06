const express = require('express');
const router = express.Router();
const { Employee, Attendance } = require('../models');
const { Op } = require('sequelize');

// SCAN CARD ENDPOINT
router.post('/scan', async (req, res) => {
    const { keycardId } = req.body;
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD

    try {
        // Find Employee by Keycard
        const employee = await Employee.findOne({ where: { keycard: keycardId } });

        if (!employee) {
            // Log as security alert? (Optional: store in separate SecurityLog table)
            return res.status(404).json({
                success: false,
                message: 'Kartu Ini Belum Terdaftar',
                type: 'error'
            });
        }

        if (employee.status !== 'Active') {
            return res.status(403).json({
                success: false,
                message: 'Kartu Karyawan Tidak Aktif',
                type: 'warning'
            });
        }

        // Logic Attendance (Similar to frontend logic)
        const dayOfWeek = now.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const msm = (hours * 60) + minutes;

        let status = 'Present';
        let message = 'ACCESS GRANTED';
        let type = 'success';

        if (isWeekend) {
            status = 'Overtime';
            message = 'Lembur Tercatat - Terima kasih!';
            type = 'info';
        } else {
            if (msm >= 360 && msm <= 515) { // 06:00 - 08:35
                status = 'Present';
                message = `Hadir Pukul ${hours}:${minutes.toString().padStart(2, '0')}`;
            } else if (msm > 515 && msm <= 1019) { // > 08:35 - 17:00
                status = 'Late';
                message = 'Anda Terlambat Hari ini';
                type = 'warning';
            } else if (msm > 1019) { // > 17:00
                status = 'Checkout';
                message = 'Anda Berhasil Checkout';
                type = 'info';
            }
        }

        // Prevent duplicate logs for same day/type if needed
        // For simplicity, we just log every scan
        await Attendance.create({
            employeeId: employee.id,
            date: dateString,
            time: timeString,
            status: status,
            keycardUsed: keycardId
        });

        res.json({
            success: true,
            message,
            type,
            employee
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET records for employee
router.get('/history/:employeeId', async (req, res) => {
    try {
        const records = await Attendance.findAll({
            where: { employeeId: req.params.employeeId },
            order: [['date', 'DESC'], ['time', 'DESC']]
        });
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
