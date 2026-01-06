import React, { useState, useEffect } from 'react';
import { Users, CreditCard, ScanLine, LogOut, Plus, Search, X, BarChart2, ShieldCheck, ShieldAlert, Activity, Trash2, CheckCircle2, Download, Edit2 } from 'lucide-react'; // Added CheckCircle2, Download, Edit2
import { Link, useNavigate } from 'react-router-dom';
import { MOCK_EMPLOYEES, MOCK_LOGS } from '../data/mockData';
import { api } from '../services/api';

const Dashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('employees');

    // Data State
    const [employees, setEmployees] = useState(() => {
        try {
            // [DATABASE DECK] Main Employee Database Storage
            const saved = localStorage.getItem('kadin_integrated_db_v1');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Ensure all employees have required fields
                return parsed.map(emp => ({
                    ...emp,
                    attendance: emp.attendance || [],
                    lateRecords: emp.lateRecords || [],
                    overtimeRecords: emp.overtimeRecords || []
                }));
            }
            return MOCK_EMPLOYEES;
        } catch (e) {
            console.error("LocalStorage Corrupt", e);
            localStorage.removeItem('kadin_integrated_db_v1');
            return MOCK_EMPLOYEES;
        }
    });
    const [currentUser, setCurrentUser] = useState(null);
    const [securityAlerts, setSecurityAlerts] = useState([]);
    const [logFilter, setLogFilter] = useState('all'); // 'all' or 'security'

    // Tambahkan ini di deretan useState lainnya
    const [accessLogs, setAccessLogs] = useState([]);

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [addStep, setAddStep] = useState(1); // 1: Form Input, 2: RFID Scan
    const [formData, setFormData] = useState({
        name: '',
        position: '',
        division: '',
        status: 'Active',
        photo: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop'
    });
    const [scannedCardId, setScannedCardId] = useState('');
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit Attendance State
    const [showEditAttendanceModal, setShowEditAttendanceModal] = useState(false);
    const [attendanceEditData, setAttendanceEditData] = useState({
        employeeId: '',
        date: '',
        status: 'Present' // Present, Absent
    });

    // Simulation State
    const [simKeycard, setSimKeycard] = useState('');
    const [simResult, setSimResult] = useState(null); // { type: 'success' | 'error', message: string, detail?: object }

    // Init & Persistence
    useEffect(() => {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }

        // Initialize Database Deck if empty
        if (!localStorage.getItem('kadin_integrated_db_v1')) {
            localStorage.setItem('kadin_integrated_db_v1', JSON.stringify(MOCK_EMPLOYEES));
        }

        // FETCH FROM API
        const fetchData = async () => {
            const data = await api.getEmployees();
            if (data) {
                // Ensure fields exist
                let processed = data.map(emp => ({
                    ...emp,
                    attendance: emp.attendance || [],
                    lateRecords: emp.lateRecords || [],
                    overtimeRecords: emp.overtimeRecords || []
                }));

                setEmployees(processed);
                // Also update local storage as backup
                localStorage.setItem('kadin_integrated_db_v1', JSON.stringify(processed));
            }
        };
        if (currentUser) {
            fetchData();
        }
    }, [currentUser]);

    // Save employees to local storage whenever it changes
    useEffect(() => {
        localStorage.setItem('kadin_integrated_db_v1', JSON.stringify(employees));
    }, [employees]);

    // PERMISSIONS: HR (SDM) or IT (Teknologi Informasi)
    const isAuthorized = ['SDM', 'Teknologi Informasi', 'IT'].includes(currentUser?.division);

    const handleSimulateScan = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setSimResult(null);

        // RBAC Check for Scan - UNIVERSAL RESTRICTION (Even for Admins)
        if (simKeycard !== currentUser?.keycard) {
            const currentTime = new Date().toLocaleString('id-ID');
            setSimResult({
                type: 'error',
                message: 'Anda Salah Melakukan Scan Pada Kartu Anda Sendiri!',
                detail: null
            });
            // Log attempt
            setSecurityAlerts(prev => [{
                id: Date.now(),
                timestamp: currentTime,
                keycardAttempt: simKeycard,
                type: 'UNAUTHORIZED_SCAN',
                status: 'DENIED',
                message: `${currentUser?.name} ini salah menginput/scan kartu yang bukan miliknya`
            }, ...(prev || [])]);

            // Add to Access Logs so it shows up in Security Alerts filter
            setAccessLogs(prev => [{
                id: Date.now(),
                timestamp: currentTime,
                employee: currentUser?.name || 'Self-Unauthorized',
                keycard: simKeycard,
                status: 'DENIED',
                location: 'Main Entrance'
            }, ...(Array.isArray(prev) ? prev : [])]);

            return;
        }

        // 1. TRY ONLINE API SCAN (Optimistic / Fire-and-Forget style)
        let apiSuccess = false;
        try {
            const result = await api.scanCard(simKeycard);
            if (result && result.success) {
                apiSuccess = true;
                // Note: We continue to Local Logic to ensure Frontend State identifies the user and updates the calendar immediately.
                // The API response `employee` might not have the JSON arrays updated depending on backend implementation.
            }
        } catch (error) {
            console.warn("Offline Scan / API Error", error);
        }

        // 2. UNIVERSAL LOGIC (Run Locally to Update UI State Immediately)
        // This ensures Calendar/Performance tabs update instantly.

        // Find employee in local state
        const employeeIndex = employees.findIndex(emp => emp.keycard === simKeycard);
        const employee = employees[employeeIndex];

        if (employee && employee.status === 'Active') {
            // Record Attendance Logic
            const now = new Date();
            // FIX: Manual construction to guarantee YYYY-MM-DD format regardless of locale
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            const hours = now.getHours();
            const minutes = now.getMinutes();
            const msm = (hours * 60) + minutes; // Minutes Since Midnight

            // Check if today is weekend (0 = Sunday, 6 = Saturday)
            // Robust check using now.getDay() (Local Time)
            const dayOfWeek = now.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            // Create a shallow copy of the employee to avoid direct state mutation
            let updatedEmployee = {
                ...employee,
                attendance: [...(employee.attendance || [])],
                lateRecords: [...(employee.lateRecords || [])],
                overtimeRecords: [...(employee.overtimeRecords || [])]
            };

            // Determine Message & Type
            let message = 'ACCESS GRANTED';
            let type = 'success';
            let isLate = false;
            let logStatus = 'Granted';

            if (isWeekend) {
                // Weekend overtime
                message = 'Lembur Tercatat - Terima kasih atas dedikasi Anda!';
                type = 'info';
                logStatus = 'Overtime';

                if (!updatedEmployee.overtimeRecords.includes(today)) {
                    updatedEmployee.overtimeRecords.push(today);
                }
            } else if (msm >= 1020) { // After 17:00 (5 PM)
                // Weekday Overtime / Late Checkout
                message = 'Lembur Hari Kerja Tercatat - Kerja bagus!';
                type = 'info';
                logStatus = 'Overtime';

                if (!updatedEmployee.overtimeRecords.includes(today)) {
                    updatedEmployee.overtimeRecords.push(today);
                }
            } else {
                // Weekday logic
                if (msm >= 360 && msm <= 515) {
                    message = `Anda sukses Hadir Pada Jam ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    type = 'success';
                    isLate = false;
                    logStatus = 'Present';
                } else if (msm >= 516 && msm <= 1019) {
                    message = 'Anda Terlambat Hari ini, Tingkatkan Kualitas Performa Anda.';
                    type = 'warning';
                    isLate = true;
                    logStatus = 'Late';
                } else {
                    // Unauthorized / Unknown Card
                    setSimResult({
                        type: 'error',
                        message: employee ? 'KARTU TIDAK AKTIF' : 'ANDA BELUM TERDAFTAR',
                        detail: null
                    });

                    const currentTime = new Date().toLocaleString('id-ID');

                    setSecurityAlerts(prev => [{
                        id: Date.now(),
                        timestamp: currentTime,
                        keycardAttempt: simKeycard,
                        type: 'Access Denied',
                        status: 'DENIED'
                    }, ...prev]);

                    setAccessLogs(prev => [{
                        id: Date.now(),
                        timestamp: currentTime,
                        employee: 'Unknown',
                        keycard: simKeycard || 'Unknown',
                        status: 'DENIED',
                        location: 'Main Entrance'
                    }, ...prev]);
                }
                setSimKeycard('');
            }
        }
    };

    const handleDeleteEmployee = async (id) => {
        if (id === currentUser?.id) {
            alert('Anda tidak dapat menghapus akun sendiri!');
            return;
        }
        if (window.confirm(`Hapus data karyawan ${id}?`)) {
            // TRY API
            try {
                await api.deleteEmployee(id);
            } catch (err) {
                console.warn("Offline delete fallback");
            }

            // Always update local state for immediate feedback
            setEmployees(prev => prev.filter(emp => emp.id !== id));
        }
    };

    // --- ENHANCEMENT: EXPORT & EDIT ATTENDANCE ---

    const handleExportCSV = (userOnly = false) => {
        // Headers
        const headers = ['ID Karyawan,Nama Lengkap,Divisi,Tanggal,Status'];

        // Data Rows
        let csvRows = [];

        const targetEmployees = userOnly
            ? employees.filter(e => e.id === currentUser?.id)
            : employees;

        targetEmployees.forEach(emp => {
            const safeName = emp.name.replace(/,/g, ' '); // Handle commas in names

            // 1. Export Attendance (Hadir)
            if (emp.attendance) {
                emp.attendance.forEach(date => {
                    csvRows.push(`${emp.id},${safeName},${emp.division},${date},Hadir`);
                });
            }

            // 3. Export Overtime
            if (emp.overtimeRecords) {
                emp.overtimeRecords.forEach(date => {
                    csvRows.push(`${emp.id},${safeName},${emp.division},${date},Lembur`);
                });
            }
        });

        if (csvRows.length === 0) {
            alert('Tidak ada data untuk diexport.');
            return;
        }

        const csvString = [headers, ...csvRows].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const openEditAttendance = (employee) => {
        setAttendanceEditData({
            employeeId: employee.id,
            date: new Date().toLocaleDateString('en-CA'), // Default today YYYY-MM-DD
            status: 'Present'
        });
        setShowEditAttendanceModal(true);
    };

    const handleSaveAttendanceEdit = (e) => {
        e.preventDefault();
        const { employeeId, date, status } = attendanceEditData;

        // Validation
        if (!date) {
            alert('Pilih tanggal!');
            return;
        }

        setEmployees(prev => prev.map(emp => {
            if (emp.id !== employeeId) return emp;

            // Shallow copies
            let newAttendance = [...(emp.attendance || [])];
            let newLate = [...(emp.lateRecords || [])];

            if (status === 'Present') {
                if (!newAttendance.includes(date)) {
                    newAttendance.push(date);
                }
            } else {
                // Remove (Alpa/Clear)
                newAttendance = newAttendance.filter(d => d !== date);
                newLate = newLate.filter(d => d !== date);
            }

            return {
                ...emp,
                attendance: newAttendance,
                lateRecords: newLate
            };
        }));

        alert('Data Absensi Berhasil Diupdate!');
        setShowEditAttendanceModal(false);
    };

    // Step 1: Form Submit -> Move to Scan
    const handleFormNext = (e) => {
        e.preventDefault();
        setAddStep(2);
    };

    // Step 2: Scan Logic (Add or Update)
    const handleScanSubmit = async (e) => {
        e.preventDefault();
        if (!scannedCardId) return;

        // 1. Cek apakah kartu sudah dipakai orang lain
        const isTaken = employees.find(emp =>
            emp.keycard === scannedCardId && emp.id !== editingEmployee?.id
        );

        if (isTaken) {
            alert(`Kartu ${scannedCardId} sudah digunakan oleh ${isTaken.name}!`);
            setScannedCardId('');
            return;
        }

        if (editingEmployee) {
            // UPDATE EXISTING
            const updatedEmployee = { ...editingEmployee, keycard: scannedCardId, status: formData.status };

            // TRY API
            try {
                await api.updateEmployee(updatedEmployee.id, updatedEmployee);
            } catch (err) {
                console.warn("Offline update fallback");
            }

            setEmployees(prev => prev.map(emp =>
                emp.id === editingEmployee.id
                    ? { ...emp, ...updatedEmployee }
                    : emp
            ));

            // Critical: Update the editingEmployee state too so the UI reflects the change immediately if not closed
            setEditingEmployee(updatedEmployee);

            alert(`Update Berhasil!\nData ${editingEmployee.name} telah diperbarui menjadi Keycard: ${scannedCardId}`);
            resetModal(); // Close modal after success
        } else {
            // ADD NEW
            const maxId = employees.reduce((max, emp) => {
                const num = parseInt(emp.id.split('KDN-')[1]);
                return num > max ? num : max;
            }, 0);

            const nextId = `KDN-${String(maxId + 1).padStart(3, '0')}`;

            const newEmployee = {
                id: nextId,
                ...formData,
                keycard: scannedCardId,
                attendance: [],
                lateRecords: [],
                overtimeRecords: []
            };

            // TRY API
            try {
                await api.createEmployee(newEmployee);
            } catch (err) {
                console.warn("Offline create fallback");
            }

            setEmployees(prev => [...prev, newEmployee]);
            alert(`Karyawan berhasil ditambahkan!\nNama: ${newEmployee.name}\nID: ${newEmployee.id}\nCard: ${newEmployee.keycard}`);
        }

        resetModal();
    };

    const resetModal = () => {
        setShowAddModal(false);
        setAddStep(1);
        setScannedCardId('');
        setEditingEmployee(null);
        setFormData({
            name: '',
            position: '',
            division: '',
            status: 'Active',
            photo: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop'
        });
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, photo: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const openAddModal = () => {
        resetModal();
        setShowAddModal(true);
    };

    const openEditCardModal = (employee) => {
        resetModal();
        setEditingEmployee(employee);
        setFormData(employee); // Pre-fill form data (status, name, etc)
        setScannedCardId(employee.keycard); // Pre-fill current card
        setAddStep(2); // Jump straight to scan
        setShowAddModal(true);
    };

    return (
        <div className="flex text-light page-transition" style={{ height: '100vh', overflow: 'hidden', background: 'var(--color-bg)', position: 'relative' }}>
            {/* Background Decorative Elements */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 0,
                pointerEvents: 'none',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '-15%',
                    right: '-5%',
                    width: '400px',
                    height: '400px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 70%)',
                    filter: 'blur(40px)'
                }}></div>
                <div style={{
                    position: 'absolute',
                    bottom: '5%',
                    left: '20%',
                    width: '300px',
                    height: '300px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, transparent 70%)',
                    filter: 'blur(30px)'
                }}></div>
            </div>
            {/* Sidebar */}
            <aside style={{ width: '260px', background: 'var(--color-sidebar-bg)', borderRight: '1px solid var(--color-border)', padding: '2rem 1rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '3rem', paddingLeft: '1rem', textAlign: 'center' }}>
                    <img src="/kadin-logo.png" alt="Logo" style={{ width: '80px', marginBottom: '1rem', filter: 'drop-shadow(0 0 15px rgba(212,175,55,0.3))' }} />
                    <h2 className="text-gold" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', margin: 0, letterSpacing: '0.05em' }}>KADIN INDONESIA</h2>
                    <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sinergi Membangun Negeri</span>
                </div>

                <nav className="flex-col gap-sm" style={{ display: 'flex' }}>
                    <button
                        className={`btn sidebar-link ${activeTab === 'employees' ? 'active' : ''}`}
                        style={{ justifyContent: 'flex-start', background: 'transparent', border: 'none', textAlign: 'left', fontWeight: 'bold' }}
                        onClick={() => setActiveTab('employees')}
                    >
                        <Users size={20} style={{ marginRight: '10px' }} /> {isAuthorized ? 'Manajemen Karyawan' : 'Profil Saya'}
                    </button>

                    {isAuthorized && (
                        <button
                            className={`btn sidebar-link ${activeTab === 'logs' ? 'active' : ''}`}
                            style={{ justifyContent: 'flex-start', background: 'transparent', border: 'none', textAlign: 'left', fontWeight: 'bold' }}
                            onClick={() => setActiveTab('logs')}
                        >
                            <CreditCard size={20} style={{ marginRight: '10px' }} /> Access Logs
                        </button>
                    )}

                    <button
                        className={`btn sidebar-link ${activeTab === 'simulation' ? 'active' : ''}`}
                        style={{ justifyContent: 'flex-start', background: 'transparent', border: 'none', textAlign: 'left', fontWeight: 'bold' }}
                        onClick={() => setActiveTab('simulation')}
                    >
                        <ScanLine size={20} style={{ marginRight: '10px' }} /> Security Check
                    </button>

                    <button
                        className={`btn sidebar-link ${activeTab === 'performance' ? 'active' : ''}`}
                        style={{ justifyContent: 'flex-start', background: 'transparent', border: 'none', textAlign: 'left', fontWeight: 'bold' }}
                        onClick={() => setActiveTab('performance')}
                    >
                        <BarChart2 size={20} style={{ marginRight: '10px' }} /> Grafik Performa
                    </button>
                </nav>

                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--color-border)', padding: '1rem 0' }}>
                    {currentUser && (
                        <div className="flex items-center gap-md" style={{ padding: '0 1rem 1rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden', color: '#000' }}>
                                {currentUser.photo ? (
                                    <img src={currentUser.photo} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                                ) : currentUser.name.charAt(0)}
                                <span style={{ display: 'none' }}>{currentUser.name.charAt(0)}</span>
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-heading)' }}>{currentUser.name}</h4>
                                <span className="text-muted" style={{ fontSize: '0.75rem' }}>{currentUser.position}</span>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => {
                            localStorage.removeItem('currentUser');
                            navigate('/login');
                        }}
                        className="btn"
                        style={{ justifyContent: 'flex-start', width: '100%', border: 'none', background: 'transparent', color: 'var(--color-text)', fontWeight: 'bold', paddingLeft: '1rem' }}
                    >
                        <LogOut size={20} style={{ marginRight: '10px' }} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                {/* Top Header */}
                <header className="flex justify-between items-center glass-card" style={{ padding: '1rem 2rem', borderRadius: '0 0 0 20px', margin: '0 0 1rem 1rem', borderTop: 'none', borderRight: 'none' }}>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
                        {activeTab === 'employees' && 'Manajemen Karyawan'}
                        {activeTab === 'logs' && 'Log Akses Real-time'}
                        {activeTab === 'simulation' && 'Simulasi Akses Pintu'}
                        {activeTab === 'performance' && 'Grafik Performa Karyawan'}
                    </h2>
                    <div className="flex items-center gap-md">
                        <div className="flex items-center" style={{ background: 'var(--color-card-bg)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                            <Search size={18} className="text-muted" />
                            <input
                                type="text"
                                placeholder="Search data..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', marginLeft: '10px', outline: 'none' }}
                            />
                        </div>
                        {isAuthorized && (
                            <button
                                onClick={() => {
                                    setActiveTab('logs');
                                    setLogFilter('security');
                                }}
                                className="btn"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '8px',
                                    background: 'rgba(220, 38, 38, 0.1)',
                                    border: '1px solid rgba(220, 38, 38, 0.3)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.2)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'}
                            >
                                <ShieldAlert size={20} style={{ color: '#dc2626' }} />
                                <span style={{ fontSize: '0.9rem', color: '#dc2626', fontWeight: 'bold' }}>{securityAlerts.length} Alerts</span>
                            </button>
                        )}
                        {currentUser && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden', color: '#000' }}>
                                    {currentUser.photo ? (
                                        <img src={currentUser.photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                                    ) : (
                                        currentUser.name.charAt(0)
                                    )}
                                    <span style={{ display: 'none' }}>{currentUser.name.charAt(0)}</span>
                                </div>
                                <span style={{ fontSize: '0.9rem' }}>{currentUser.name}</span>
                            </div>
                        )}
                    </div>
                </header>

                {/* Content Area */}
                <div style={{ padding: '2rem' }}>

                    {/* ACCESS LOGS TABLE */}
                    {activeTab === 'logs' && (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-lg">
                                <h3 style={{ color: 'var(--color-heading)', margin: 0 }}>Access Logs</h3>
                                <div className="flex gap-sm">
                                    <button
                                        onClick={() => setLogFilter('all')}
                                        className="btn"
                                        style={{
                                            padding: '0.5rem 1rem',
                                            background: logFilter === 'all' ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                                            color: logFilter === 'all' ? '#000' : 'var(--color-text)',
                                            border: '1px solid var(--color-primary)'
                                        }}
                                    >
                                        All Logs
                                    </button>
                                    <button
                                        onClick={() => setLogFilter('security')}
                                        className="btn"
                                        style={{
                                            padding: '0.5rem 1rem',
                                            background: logFilter === 'security' ? '#dc2626' : 'transparent',
                                            color: logFilter === 'security' ? '#fff' : 'var(--color-text)',
                                            border: '1px solid #dc2626'
                                        }}
                                    >
                                        Security Alerts ({securityAlerts.length})
                                    </button>
                                    {logFilter === 'security' && securityAlerts.length > 0 && (
                                        <button
                                            onClick={() => {
                                                setSecurityAlerts([]);
                                                setAccessLogs(prev => prev.filter(log => log.status !== 'DENIED'));
                                            }}
                                            className="btn"
                                            style={{
                                                padding: '0.5rem 1rem',
                                                background: '#dc2626',
                                                color: '#fff',
                                                border: '1px solid #dc2626'
                                            }}
                                        >
                                            Clear Alerts
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Simulation View */}
                    {activeTab === 'simulation' && (
                        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                                <div style={{ margin: '0 auto 1.5rem', width: '80px', height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ScanLine size={40} className="text-gold" />
                                </div>
                                <h3 className="text-center" style={{ marginBottom: '1.5rem' }}>Scan Keycard / RFID</h3>

                                <form onSubmit={handleSimulateScan} style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                                    <input
                                        type="text"
                                        value={simKeycard}
                                        onChange={(e) => setSimKeycard(e.target.value)}
                                        placeholder="Scan or Enter Keycard ID (e.g., KEY-8821)"
                                        style={{
                                            padding: '1rem',
                                            background: 'var(--color-input-bg)',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-text)',
                                            borderRadius: '8px',
                                            textAlign: 'center',
                                            fontSize: '1.2rem',
                                            letterSpacing: '1px',
                                            outline: 'none'
                                        }}
                                        autoFocus
                                    />
                                    <button type="submit" className="btn btn-primary" style={{ padding: '1rem' }}>READ CARD</button>
                                </form>

                                {simResult && simResult.type !== 'error' && (
                                    <div className="animate-fade-in" style={{
                                        marginTop: '2rem',
                                        borderRadius: '12px',
                                        background: simResult.type === 'warning' ? 'rgba(234, 179, 8, 0.1)' : (simResult.type === 'info' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)'),
                                        border: `1px solid ${simResult.type === 'warning' ? '#eab308' : (simResult.type === 'info' ? '#3b82f6' : '#22c55e')}`,
                                        overflow: 'hidden'
                                    }}>

                                        {/* Header Status */}
                                        <div style={{
                                            background: simResult.type === 'warning' ? '#eab308' : (simResult.type === 'info' ? '#3b82f6' : '#22c55e'),
                                            padding: '0.5rem',
                                            color: '#fff',
                                            fontWeight: 'bold'
                                        }}>
                                            {simResult.message}
                                        </div>

                                        <div style={{ padding: '1.5rem' }}>
                                            <div style={{
                                                color: simResult.type === 'warning' ? '#eab308' : (simResult.type === 'info' ? '#3b82f6' : '#4ade80'),
                                                marginBottom: '1rem',
                                                display: 'flex',
                                                justifyContent: 'center'
                                            }}>
                                                {simResult.type === 'warning' ? <ShieldAlert size={48} /> : (simResult.type === 'info' ? <LogOut size={48} /> : <ShieldCheck size={48} />)}
                                            </div>

                                            {simResult.detail && (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                                    {/* Photo */}
                                                    <div style={{
                                                        width: '150px',
                                                        height: '150px',
                                                        borderRadius: '50%',
                                                        border: '4px solid var(--color-primary)',
                                                        overflow: 'hidden',
                                                        boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
                                                    }}>
                                                        <img
                                                            src={simResult.detail.photo || 'https://via.placeholder.com/150?text=No+Photo'}
                                                            alt={simResult.detail.name}
                                                            loading="lazy"
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=No+Photo'; }}
                                                        />
                                                    </div>

                                                    {/* Details */}
                                                    <div style={{ textAlign: 'center' }}>
                                                        <h2 style={{ color: 'var(--color-heading)', margin: '0 0 0.5rem', fontSize: '1.75rem' }}>{simResult.detail.name}</h2>
                                                        <div style={{ background: 'rgba(255,255,255,0.1)', display: 'inline-block', padding: '0.25rem 1rem', borderRadius: '99px', marginBottom: '1rem' }}>
                                                            <span className="text-gold" style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 'bold' }}>{simResult.detail.keycard}</span>
                                                        </div>
                                                        <p className="text-muted" style={{ margin: 0 }}>{simResult.detail.position}</p>
                                                        <p className="text-muted" style={{ margin: 0 }}>{simResult.detail.division} ({simResult.detail.id})</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>


                        </div>
                    )}

                    {/* ERROR POPUP MODAL */}
                    {simResult && simResult.type === 'error' && (
                        <div style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2000,
                            backdropFilter: 'blur(5px)'
                        }}>
                            <div className="glass-card animate-fade-in" style={{
                                padding: '2rem',
                                maxWidth: '400px',
                                textAlign: 'center',
                                border: '1px solid var(--color-secondary)',
                                background: '#1a0505',
                                boxShadow: '0 0 30px rgba(139, 0, 0, 0.3)'
                            }}>
                                <div style={{
                                    width: '60px', height: '60px',
                                    background: 'rgba(139, 0, 0, 0.2)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 1.5rem',
                                    color: 'var(--color-secondary)'
                                }}>
                                    <ShieldAlert size={32} />
                                </div>
                                <h3 style={{ color: '#fff', marginBottom: '1rem' }}>Akses Ditolak</h3>
                                <p className="text-muted" style={{ marginBottom: '2rem', lineHeight: '1.6', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                    {simResult.message || 'ANDA BELUM TERDAFTAR'}
                                </p>
                                <button
                                    className="btn"
                                    onClick={() => setSimResult(null)}
                                    style={{
                                        background: 'var(--color-secondary)',
                                        color: '#fff',
                                        width: '100%'
                                    }}
                                >
                                    Tutup / Close
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Stats & Tables (Hide for Simulation) */}
                    {/* Stats & Tables (Only for Employees or Logs) */}
                    {(activeTab === 'employees' || activeTab === 'logs') && (
                        <>
                            {/* Stats Row */}
                            <div className="grid grid-cols-3 gap-lg mb-lg">
                                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ padding: '1rem', background: 'rgba(212, 175, 55, 0.2)', borderRadius: '12px', color: 'var(--color-primary)' }}><Users /></div>
                                    <div>
                                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>Total Karyawan</span>
                                        <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{employees.length}</h3>
                                    </div>
                                </div>
                                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ padding: '1rem', background: 'rgba(56, 189, 248, 0.2)', borderRadius: '12px', color: '#38bdf8' }}><CreditCard /></div>
                                    <div>
                                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>Active Keycards</span>
                                        <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{employees.filter(e => e.status === 'Active').length}</h3>
                                    </div>
                                </div>
                                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ padding: '1rem', background: 'rgba(139, 0, 0, 0.2)', borderRadius: '12px', color: 'var(--color-secondary)' }}><Activity /></div>
                                    <div>
                                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>Security Alerts</span>
                                        <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-secondary)' }}>{securityAlerts.length}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Header for Table + Add Button + Export */}
                            {activeTab === 'employees' && isAuthorized && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '1rem' }}>
                                    <button
                                        className="btn"
                                        onClick={() => handleExportCSV(false)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid #10b981' }}
                                    >
                                        <Download size={18} /> Export Excel
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={openAddModal}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        <Plus size={18} /> Tambah Karyawan
                                    </button>
                                </div>
                            )}

                            {/* Table View */}
                            <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                                {activeTab === 'employees' ? (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>ID Karyawan</th>
                                                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Nama Lengkap</th>
                                                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Posisi / Jabatan</th>
                                                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Divisi</th>
                                                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Keycard ID</th>
                                                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Status</th>
                                                {isAuthorized && <th style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'right' }}>Action</th>}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {employees.filter(emp => {
                                                // RBAC Filter
                                                if (!isAuthorized && currentUser && emp.id !== currentUser.id) return false;

                                                // Search Filter
                                                return emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                    emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                    emp.position.toLowerCase().includes(searchQuery.toLowerCase())
                                            }).sort((a, b) => {
                                                const idA = parseInt(a.id.split('KDN-')[1]) || 0;
                                                const idB = parseInt(b.id.split('KDN-')[1]) || 0;
                                                return idA - idB;
                                            }).map(emp => (
                                                <tr key={emp.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '1rem' }}>{emp.id}</td>
                                                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{emp.name}</td>
                                                    <td style={{ padding: '1rem' }}>{emp.position}</td>
                                                    <td style={{ padding: '1rem' }}>{emp.division}</td>
                                                    <td style={{ padding: '1rem', fontFamily: 'monospace', color: 'var(--color-primary)' }}>{emp.keycard}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span style={{
                                                            padding: '0.25rem 0.75rem',
                                                            borderRadius: '99px',
                                                            fontSize: '0.85rem',
                                                            background: emp.status === 'Active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                            color: emp.status === 'Active' ? '#4ade80' : '#f87171'
                                                        }}>
                                                            {emp.status}
                                                        </span>
                                                    </td>
                                                    {isAuthorized && (
                                                        <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                            <button onClick={() => openEditAttendance(emp)} style={{ background: 'rgba(234, 179, 8, 0.2)', border: '1px solid rgba(234, 179, 8, 0.5)', borderRadius: '6px', color: '#eab308', cursor: 'pointer', padding: '0.5rem' }} title="Edit Absensi">
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button onClick={() => openEditCardModal(emp)} style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.5)', borderRadius: '6px', color: '#38bdf8', cursor: 'pointer', padding: '0.5rem' }} title="Update Keycard">
                                                                <CreditCard size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteEmployee(emp.id)}
                                                                style={{ background: 'rgba(248, 113, 113, 0.2)', border: '1px solid rgba(248, 113, 113, 0.5)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', padding: '0.5rem' }}
                                                                title="Hapus Data Karyawan"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Timestamp</th>
                                                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Nama Karyawan</th>
                                                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Lokasi Akses</th>
                                                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Status Akses</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.isArray(accessLogs) && accessLogs
                                                .filter(log => (logFilter === 'all' || (logFilter === 'security' && log.status === 'DENIED')))
                                                .map((log, index) => (
                                                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{log.timestamp}</td>
                                                        <td style={{ padding: '1rem' }}>{log.employee}</td>
                                                        <td style={{ padding: '1rem' }}>{log.location}</td>
                                                        <td style={{ padding: '1rem' }}>
                                                            <span style={{
                                                                color: log.status === 'DENIED' ? '#f87171' : '#4ade80',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                {log.status === 'DENIED' ? 'ACCESS DENIED' : 'ACCESS GRANTED'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </>
                    )}

                    {/* PERFORMANCE TAB */}
                    {/* PERFORMANCE TAB (PERSONAL CALENDAR) */}
                    {activeTab === 'performance' && currentUser && (
                        <div className="animate-fade-in">
                            <h2 className="text-gold" style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
                                Absensi Saya
                            </h2>
                            <p className="text-muted" style={{ marginBottom: '2rem' }}>
                                Kehadiran Anda tercatat otomatis saat melakukan scanning kartu di Security Check.
                            </p>
                            <div style={{ marginBottom: '1rem' }}>
                                <button
                                    className="btn"
                                    onClick={() => handleExportCSV(true)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid #10b981' }}
                                >
                                    <Download size={18} /> Export Data Saya
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
                                {/* Left Column: Calendar */}
                                <div className="glass-card" style={{ padding: '2rem' }}>
                                    <div className="flex justify-between items-center mb-lg">
                                        <h3 style={{ color: '#fff', margin: 0 }}>Januari 2026</h3>
                                        <div className="flex gap-md text-muted" style={{ fontSize: '0.9rem' }}>
                                            <div className="flex items-center gap-sm">
                                                <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }}></div> Hadir
                                            </div>
                                            <div className="flex items-center gap-sm">
                                                <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px' }}></div> Alpha
                                            </div>
                                            <div className="flex items-center gap-sm">
                                                <div style={{ width: '12px', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}></div> Absen/Future
                                            </div>
                                        </div>
                                    </div>

                                    {/* Calendar Grid */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(7, 1fr)',
                                        gap: '10px',
                                        textAlign: 'center'
                                    }}>
                                        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
                                            <div key={day} style={{ color: '#94a3b8', fontSize: '0.85rem', paddingBottom: '1rem' }}>{day}</div>
                                        ))}

                                        {/* Empty cells for days before Jan 1st 2026 (Thursday) */}
                                        {[...Array(4)].map((_, i) => <div key={`empty-${i}`} />)}

                                        {/* Days 1-31 */}
                                        {[...Array(31)].map((_, i) => {
                                            const day = i + 1;
                                            const dateStr = `2026-01-${String(day).padStart(2, '0')}`;

                                            // Find current user in employees array to get latest attendance
                                            const currentEmployee = employees.find(e => e.id === currentUser.id);
                                            const isPresent = currentEmployee?.attendance?.includes(dateStr);
                                            const isLate = currentEmployee?.lateRecords?.includes(dateStr);
                                            const isOvertime = currentEmployee?.overtimeRecords?.includes(dateStr);

                                            // Highlight "Today" (Jan 3rd in simulation)
                                            const isToday = day === 3;

                                            // Determine Absent Status (Red)
                                            // Logic: If date is in past (< today), NOT weekend, and NOT Present -> Red
                                            const todayDate = new Date();
                                            const currentCheckDate = new Date(dateStr);

                                            // Reset times for comparison
                                            const todayMidnight = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
                                            const checkMidnight = new Date(currentCheckDate.getFullYear(), currentCheckDate.getMonth(), currentCheckDate.getDate());

                                            const isPast = checkMidnight < todayMidnight;
                                            const isWeekend = day % 7 === 0 || day % 7 === 6; // Simple check based on Jan 2026. Jan 1 is Thu.
                                            // Better weekend check:
                                            const checkDayOfWeek = currentCheckDate.getDay();
                                            const isWeekendReal = checkDayOfWeek === 0 || checkDayOfWeek === 6;

                                            const isAbsent = isPast && !isWeekendReal && !isPresent && !isOvertime;

                                            return (
                                                <div key={day} style={{
                                                    aspectRatio: '1/1',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: isOvertime ? 'rgba(59, 130, 246, 0.3)' : (isPresent ? (isLate ? '#eab308' : '#10b981') : (isAbsent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)')),
                                                    borderRadius: '8px',
                                                    color: (isPresent || isOvertime || isAbsent) ? (isAbsent ? '#f87171' : '#000') : 'var(--color-text)',
                                                    fontWeight: isPresent || isToday || isOvertime || isAbsent ? 'bold' : 'normal',
                                                    border: isToday ? '2px solid var(--color-primary)' : (isAbsent ? '1px solid rgba(239, 68, 68, 0.4)' : 'none'),
                                                    position: 'relative',
                                                    cursor: 'default',
                                                    transition: 'all 0.3s ease',
                                                    fontSize: isOvertime ? '0.65rem' : '1rem',
                                                    flexDirection: 'column',
                                                    gap: '2px'
                                                }}>
                                                    {isOvertime ? (
                                                        <>
                                                            <span style={{ fontSize: '0.9rem' }}>{day}</span>
                                                            <span style={{ fontSize: '0.5rem', color: '#3b82f6', fontWeight: 'bold' }}>Lembur</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {day}
                                                            {isPresent && <CheckCircle2 size={14} style={{ position: 'absolute', bottom: '4px', right: '4px', opacity: 0.6 }} />}
                                                            {isAbsent && <X size={14} style={{ position: 'absolute', bottom: '4px', right: '4px', opacity: 0.6, color: '#f87171' }} />}
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right Column: Stats & Circle Graph */}
                                <div className="flex flex-col gap-lg">
                                    <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                                        <h3 style={{ color: '#fff', marginBottom: '2rem', fontSize: '1.1rem' }}>Persentase Kehadiran (Sen - Jum)</h3>

                                        {/* CSS Donut Chart */}
                                        {(() => {
                                            const currentEmployee = employees.find(e => e.id === currentUser.id);
                                            const attendance = currentEmployee?.attendance || [];
                                            const lateRecords = currentEmployee?.lateRecords || [];
                                            const overtimeRecords = currentEmployee?.overtimeRecords || [];

                                            // Working Days in Jan 2026 (Mon-Fri) - Fixed to 20 days as requested
                                            const workingDays = [
                                                1, 2, 5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 26, 27, 28
                                            ];

                                            // Count on-time and late days
                                            const presentWorkingDays = workingDays.filter(day =>
                                                attendance.includes(`2026-01-${String(day).padStart(2, '0')}`)
                                            );

                                            const presentWorkingDayDates = presentWorkingDays.map(day =>
                                                `2026-01-${String(day).padStart(2, '0')}`
                                            );

                                            const ontimeDays = presentWorkingDayDates.filter(dateStr =>
                                                !lateRecords.includes(dateStr)
                                            ).length;

                                            const lateDays = presentWorkingDayDates.filter(dateStr =>
                                                lateRecords.includes(dateStr)
                                            ).length;

                                            // Count overtime days (weekends or after hours)
                                            const overtimeDays = overtimeRecords.filter(d => d.startsWith('2026-01')).length;

                                            // Calculate weighted performance: on-time = 100%, late = 95%, overtime = +5% bonus each
                                            const totalScore = (ontimeDays * 1.0) + (lateDays * 0.95) + (overtimeDays * 0.05);
                                            const percentage = Math.min(100, Math.round((totalScore / 20) * 100)); // Divide by 20 days

                                            return (
                                                <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto', zIndex: 1 }}>
                                                    <div style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        borderRadius: '50%',
                                                        background: `conic-gradient(#10b981 ${percentage * 3.6}deg, rgba(0, 0, 0, 0.05) 0deg)`, // Fixed conic-gradient syntax and color
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
                                                    }}>
                                                        {/* Inner Circle (Donut hole) */}
                                                        <div style={{
                                                            width: '75%',
                                                            height: '75%',
                                                            borderRadius: '50%',
                                                            background: '#fff', // Solid background for hole
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)'
                                                        }}>
                                                            <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--color-heading)' }}>{percentage}%</span>
                                                            <span className="text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Performance</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div style={{ marginTop: '2rem', textAlign: 'left' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span className="text-muted">Total Hari Kerja</span>
                                                <span style={{ color: 'var(--color-heading)', fontWeight: 'bold' }}>20 Hari</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span className="text-muted">Total Hadir</span>
                                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                                                    {(() => {
                                                        const currentEmployee = employees.find(e => e.id === currentUser.id);
                                                        const attendance = currentEmployee?.attendance || [];
                                                        return attendance.filter(d => d.startsWith('2026-01')).length;
                                                    })()} Hari
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span className="text-muted">Total Terlambat</span>
                                                <span style={{ color: '#eab308', fontWeight: 'bold' }}>
                                                    {(() => {
                                                        const currentEmployee = employees.find(e => e.id === currentUser.id);
                                                        const lateRecords = currentEmployee?.lateRecords || [];
                                                        return lateRecords.filter(d => d.startsWith('2026-01')).length;
                                                    })()} Hari
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ padding: '1.5rem', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '8px', borderLeft: '4px solid var(--color-primary)' }}>
                                        <h4 className="text-gold" style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Tips Performa</h4>
                                        <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem', lineHeight: '1.4' }}>
                                            Pastikan melakukan scan kartu sebelum jam 08:35 untuk menghindari status terlambat.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* ADD EMPLOYEE MODAL (2 STEPS) */}
                {
                    showAddModal && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(10px)' }}>
                            <div className="glass-card animate-fade-in" style={{
                                padding: '2rem',
                                maxWidth: '500px',
                                width: '100%',
                                border: editingEmployee ? '2px solid #d4af37' : '1px solid var(--color-border)',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                background: 'linear-gradient(135deg, #ffffff 0%, #fcf9f0 50%, #f1e4bc 100%)',
                                color: '#1a1a1a',
                                boxShadow: '0 20px 50px rgba(212, 175, 55, 0.4)'
                            }}>
                                <div className="flex justify-between items-center mb-lg">
                                    <h2 style={{
                                        margin: 0,
                                        color: '#8b6914',
                                        fontWeight: '800',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {editingEmployee ? 'UPDATE KEYCARD' : (addStep === 1 ? 'TAMBAH KARYAWAN' : 'VALIDASI RFID / KEYCARD')}
                                    </h2>
                                    <button onClick={resetModal} style={{ background: 'transparent', border: 'none', color: '#1a1a1a', cursor: 'pointer' }}><X size={24} /></button>
                                </div>

                                {/* STEP 1: BASIC INFO */}
                                {addStep === 1 && !editingEmployee && (
                                    <form onSubmit={handleFormNext} className="flex flex-col gap-md">
                                        <div className="form-group" style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                            <div style={{ width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto 1rem', overflow: 'hidden', border: '2px solid var(--color-primary)' }}>
                                                <img src={formData.photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handlePhotoUpload}
                                                style={{ fontSize: '0.9rem', color: '#1a1a1a', width: '200px' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#555', fontWeight: 'bold' }}>NAMA LENGKAP</label>
                                            <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d4af37', background: '#fff', color: '#1a1a1a' }} className="w-full" />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#555', fontWeight: 'bold' }}>POSISI / JABATAN</label>
                                            <input type="text" required value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d4af37', background: '#fff', color: '#1a1a1a' }} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-md">
                                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#555', fontWeight: 'bold' }}>DIVISI</label>
                                                <input type="text" required value={formData.division} onChange={e => setFormData({ ...formData, division: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d4af37', background: '#fff', color: '#1a1a1a' }} />
                                            </div>
                                        </div>
                                        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                            Lanjut Validasi Kartu <ScanLine size={18} />
                                        </button>
                                    </form>
                                )}

                                {/* STEP 2: RFID SCAN */}
                                {addStep === 2 && (
                                    <div style={{ textAlign: 'center' }}>
                                        {editingEmployee && (
                                            <div style={{
                                                marginBottom: '1.5rem',
                                                background: 'rgba(212, 175, 55, 0.1)',
                                                padding: '1.5rem',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(212, 175, 55, 0.3)'
                                            }}>
                                                <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Mengubah kartu untuk:</p>
                                                <h3 style={{ margin: '0', color: '#1a1a1a', fontSize: '1.5rem' }}>{editingEmployee.name}</h3>
                                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#d4af37', fontWeight: 'bold' }}>Kartu Saat Ini: {editingEmployee.keycard}</p>
                                            </div>
                                        )}
                                        <div style={{ margin: '2rem auto', width: '100px', height: '100px', border: '2px dashed var(--color-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="animate-pulse">
                                            <ScanLine size={48} className="text-gold" />
                                        </div>
                                        <h3 style={{ marginBottom: '0.5rem' }}>Siap Mem-validasi</h3>
                                        <p className="text-muted mb-lg">Tempelkan kartu pada reader atau input ID kartu.</p>

                                        <form onSubmit={handleScanSubmit}>
                                            {editingEmployee && (
                                                <div className="form-group" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#555', fontWeight: 'bold' }}>SET STATUS AKUN</label>
                                                    <select
                                                        value={formData.status || 'Active'}
                                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.75rem',
                                                            borderRadius: '8px',
                                                            border: '1px solid #d4af37',
                                                            background: '#fff',
                                                            color: '#1a1a1a',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        <option value="Active">Active</option>
                                                        <option value="Inactive">Inactive</option>
                                                    </select>
                                                </div>
                                            )}
                                            <input
                                                type="text"
                                                value={scannedCardId}
                                                onChange={e => setScannedCardId(e.target.value)}
                                                placeholder="Menunggu Tempel Kartu..."
                                                autoFocus
                                                style={{
                                                    width: '100%',
                                                    padding: '1.25rem',
                                                    textAlign: 'center',
                                                    background: '#fff',
                                                    border: '2px solid #d4af37',
                                                    color: '#1a1a1a',
                                                    fontFamily: 'monospace',
                                                    fontSize: '1.5rem',
                                                    borderRadius: '12px',
                                                    marginBottom: '1.5rem',
                                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                                                    outline: 'none'
                                                }}
                                            />
                                            <div className="flex gap-md">
                                                <button type="button" onClick={editingEmployee ? resetModal : () => setAddStep(1)} className="btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-muted)', fontWeight: 'bold' }}>{editingEmployee ? 'Batal' : 'Kembali'}</button>
                                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Validasi & Simpan</button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {/* EDIT ATTENDANCE MODAL */}
                {showEditAttendanceModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(10px)' }}>
                        <div className="glass-card animate-fade-in" style={{
                            padding: '2rem',
                            maxWidth: '400px',
                            width: '100%',
                            border: '1px solid var(--color-border)',
                            background: '#1a1a1a',
                            color: '#fff'
                        }}>
                            <div className="flex justify-between items-center mb-lg">
                                <h3 style={{ margin: 0 }}>Edit Absensi</h3>
                                <button onClick={() => setShowEditAttendanceModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
                            </div>

                            <form onSubmit={handleSaveAttendanceEdit} className="flex flex-col gap-md">
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#ccc' }}>Employee ID</label>
                                    <input type="text" value={attendanceEditData.employeeId} disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#333', color: '#aaa' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#ccc' }}>Tanggal (YYYY-MM-DD)</label>
                                    <input
                                        type="date"
                                        value={attendanceEditData.date}
                                        onChange={e => setAttendanceEditData({ ...attendanceEditData, date: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #555', background: '#fff', color: '#000' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#ccc' }}>Status</label>
                                    <select
                                        value={attendanceEditData.status}
                                        onChange={e => setAttendanceEditData({ ...attendanceEditData, status: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #555', background: '#fff', color: '#000' }}
                                    >
                                        <option value="Present">Hadir (Present)</option>
                                        <option value="Absent">Tidak Hadir / Clear (Alpha)</option>
                                    </select>
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                                    Simpan Perubahan
                                </button>
                            </form>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default Dashboard;
