const express = require('express');
const router = express.Router();
const { Employee, Attendance } = require('../models');

// GET all employees
router.get('/', async (req, res) => {
    try {
        const employees = await Employee.findAll({
            include: [{ model: Attendance }]
        });
        res.json(employees);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single employee
router.get('/:id', async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id, {
            include: [{ model: Attendance }]
        });
        if (!employee) return res.status(404).json({ error: 'Employee not found' });
        res.json(employee);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE new employee
router.post('/', async (req, res) => {
    try {
        const employee = await Employee.create(req.body);
        res.status(201).json(employee);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// UPDATE employee (e.g. keycard update)
router.put('/:id', async (req, res) => {
    try {
        const [updated] = await Employee.update(req.body, {
            where: { id: req.params.id }
        });
        if (updated) {
            const updatedEmployee = await Employee.findByPk(req.params.id);
            res.json(updatedEmployee);
        } else {
            res.status(404).json({ error: 'Employee not found' });
        }
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE employee
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Employee.destroy({
            where: { id: req.params.id }
        });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Employee not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
