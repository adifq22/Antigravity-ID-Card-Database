const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);

const db = require('./models');
const seedDatabase = require('./seeders/init');

// Sync DB and Start Server
db.sequelize.sync().then(async () => {
    console.log('Database synced');
    await seedDatabase();
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to sync db: ' + err.message);
});

