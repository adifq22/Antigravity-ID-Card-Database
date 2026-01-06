const { Employee } = require('../models');

const seedEmployees = [
    {
        id: 'KDN-001',
        name: 'Budi Santoso',
        position: 'HR Manager',
        division: 'SDM',
        keycard: 'KEY-8821',
        status: 'Active',
        photo: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop'
    },
    {
        id: 'KDN-002',
        name: 'Siti Aminah',
        position: 'Staff Administrasi',
        division: 'Umum',
        keycard: 'KEY-9932',
        status: 'Active',
        photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop'
    },
    {
        id: 'KDN-003',
        name: 'Rudi Hermawan',
        position: 'Security Head',
        division: 'Keamanan',
        keycard: 'KEY-7711',
        status: 'Active',
        photo: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400&h=400&fit=crop'
    },
    {
        id: 'KDN-004',
        name: 'Dewi Lestari',
        position: 'HR Specialist',
        division: 'SDM',
        keycard: 'KEY-5543',
        status: 'Active',
        photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop'
    },
    {
        id: 'KDN-005',
        name: 'Andi Saputra',
        position: 'IT Support',
        division: 'Teknologi Informasi',
        keycard: 'KEY-1122',
        status: 'Active',
        photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop'
    }
];

const seedDatabase = async () => {
    try {
        const count = await Employee.count();
        if (count === 0) {
            console.log('Seeding employees...');
            await Employee.bulkCreate(seedEmployees);
            console.log('Seeding completed successfully.');
        } else {
            console.log('Database already has data, skipping seed.');
        }
    } catch (error) {
        console.error('Error seeding database:', error);
    }
};

module.exports = seedDatabase;
