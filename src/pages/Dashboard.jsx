import React, { useState, useEffect } from 'react';
import { Users, CreditCard, ScanLine, LogOut, Plus, Search, X, BarChart2, ShieldCheck, ShieldAlert, Activity, Trash2, CheckCircle2 } from 'lucide-react'; // Added CheckCircle2
import { Link, useNavigate } from 'react-router-dom';
import { MOCK_EMPLOYEES, MOCK_LOGS } from '../data/mockData';

const Dashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('employees');

    // Data State
    const [employees, setEmployees] = useState(() => {
        try {
            const saved = localStorage.getItem('kadin_employees');
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
            localStorage.removeItem('kadin_employees');
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

    // Simulation State
    const [simKeycard, setSimKeycard] = useState('');
    const [simResult, setSimResult] = useState(null); // { type: 'success' | 'error', message: string, detail?: object }

    // Init & Persistence
    useEffect(() => {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }

        // Save Mock Data if empty
        if (!localStorage.getItem('kadin_employees')) {
            localStorage.setItem('kadin_employees', JSON.stringify(MOCK_EMPLOYEES));
        }
    }, []);

    // Save employees to local storage whenever it changes
    useEffect(() => {
        localStorage.setItem('kadin_employees', JSON.stringify(employees));
    }, [employees]);

    // PERMISSIONS: HR (SDM) or IT (Teknologi Informasi)
    const isAuthorized = ['SDM', 'Teknologi Informasi', 'IT'].includes(currentUser?.division);

    const handleSimulateScan = (e) => {
        e.preventDefault();
        setSimResult(null);

        // Simulate processing delay
        setTimeout(() => {
            // Check against current state, not just mock file
            const employee = employees.find(emp => emp.keycard === simKeycard);

            if (employee && employee.status === 'Active') {
                // Record Attendance Logic
                const now = new Date();
                const today = now.toISOString().split('T')[0];
                const hours = now.getHours();
                const minutes = now.getMinutes();
                const msm = (hours * 60) + minutes; // Minutes Since Midnight

                // Check if today is weekend (0 = Sunday, 6 = Saturday)
                const dayOfWeek = new Date(today).getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                let updatedEmployee = { ...employee };

                // Initialize arrays if needed
                if (!employee.attendance) employee.attendance = [];
                if (!employee.lateRecords) employee.lateRecords = [];
                if (!employee.overtimeRecords) updatedEmployee.overtimeRecords = [];

                // Determine Message & Type
                let message = 'ACCESS GRANTED';
                let type = 'success';
                let isLate = false;
                let logStatus = 'Granted'; // Definisikan logStatus di sini agar tidak error ReferenceError

                // Pastikan properti array ada, jika tidak ada gunakan array kosong []
                const attendance = employee.attendance || [];
                const lateRecords = employee.lateRecords || [];
                const overtimeRecords = employee.overtimeRecords || [];

                if (isWeekend) {
                    // Weekend overtime
                    message = 'Lembur Tercatat - Terima kasih atas dedikasi Anda!';
                    type = 'info';

                    // Perbaikan error .includes pada overtimeRecords
                    if (!overtimeRecords.includes(today)) {
                        updatedEmployee.overtimeRecords = [...overtimeRecords, today];
                        setEmployees(prev => prev.map(e => e.id === employee.id ? { ...e, ...updatedEmployee } : e));
                    }
                } else {
                    // Weekday logic
                    if (msm >= 360 && msm <= 515) {
                        message = `Anda sukses Hadir Pada Jam ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                        type = 'success';
                        isLate = false;
                    } else if (msm >= 516 && msm <= 1019) {
                        message = 'Anda Terlambat Hari ini, Tingkatkan Kualitas Performa Anda.';
                        type = 'warning';
                        isLate = true;
                    } else {
                        message = 'Anda Berhasil Checkout Hari Ini';
                        type = 'info';
                        isLate = false;
                    }

                    // Perbaikan error .includes pada attendance dan lateRecords
                    const needsAttendanceRecord = !attendance.includes(today);
                    const needsLateRecord = isLate && !lateRecords.includes(today);

                    if (needsAttendanceRecord || needsLateRecord) {
                        if (needsAttendanceRecord) {
                            updatedEmployee.attendance = [...attendance, today];
                        }

                        if (needsLateRecord) {
                            updatedEmployee.lateRecords = [...lateRecords, today];
                        }

                        // Gunakan spread operator agar data lama tidak hilang
                        setEmployees(prev => prev.map(e => e.id === employee.id ? { ...e, ...updatedEmployee } : e));
                    }
                }


                setSimResult({
                    type: type,
                    message: message,
                    detail: updatedEmployee
                });

                // --- PERBAIKAN DI SINI ---
                // Kita ambil waktu saat ini dalam satu variabel agar konsisten
                const currentTime = new Date().toLocaleString('id-ID');

                // Log successful scan
                setAccessLogs(prev => {
                    // Pastikan prev selalu array
                    const currentLogs = Array.isArray(prev) ? prev : [];


                    return [{
                        id: Date.now(),
                        timestamp: currentTime, // Gunakan variabel yang sudah pasti ada
                        employee: updatedEmployee?.name || 'Unknown', // Gunakan tanda tanya (?) untuk jaga-jaga
                        keycard: simKeycard,
                        status: logStatus,
                        location: 'Main Entrance'
                    }, ...currentLogs];
                });

            } else {
                // Failed scan - log as security alert
                const currentTime = new Date().toLocaleString('id-ID'); // Ambil waktu lagi

                const alertEntry = {
                    id: Date.now(),
                    timestamp: currentTime,
                    keycardAttempt: simKeycard,
                    type: 'UNKNOWN_CARD',
                    status: 'DENIED'
                };

                setSecurityAlerts(prev => [alertEntry, ...(Array.isArray(prev) ? prev : [])]);


                setAccessLogs(prev => {
                    const currentLogs = Array.isArray(prev) ? prev : [];
                    return [{
                        id: Date.now(),
                        timestamp: currentTime,
                        employee: updatedEmployee.name || 'Unknown',
                        keycard: simKeycard || 'Unknown',
                        status: logStatus,
                        location: 'Main Entrance'
                    }, ...currentLogs];
                });

                setSimResult({
                    type: 'error',
                    message: 'Kartu Ini Belum Terdaftar',
                    detail: null
                });
            }
        }, 800);
    };

    const handleDeleteEmployee = (id) => {
        if (id === currentUser?.id) {
            alert('Anda tidak dapat menghapus akun sendiri!');
            return;
        }
        if (window.confirm(`Hapus data karyawan ${id}?`)) {
            setEmployees(prev => prev.filter(emp => emp.id !== id));
        }
    };

    // Step 1: Form Submit -> Move to Scan
    const handleFormNext = (e) => {
        e.preventDefault();
        setAddStep(2);
    };

    // Step 2: Scan Logic (Add or Update)
    const handleScanSubmit = (e) => {
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
            setEmployees(prev => prev.map(emp =>
                emp.id === editingEmployee.id
                    ? { ...emp, keycard: scannedCardId, status: formData.status }
                    : emp
            ));
            alert(`Update Berhasil!\nData ${editingEmployee.name} telah diperbarui.`);
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
                keycard: scannedCardId
            };

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
        <div className="flex" style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
            {/* Sidebar */}
            <aside style={{ width: '260px', background: '#1e293b', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '2rem 1rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '3rem', paddingLeft: '1rem', textAlign: 'center' }}>
                    <img src="/kadin-logo.png" alt="Logo" style={{ width: '80px', marginBottom: '1rem', filter: 'drop-shadow(0 0 15px rgba(212,175,55,0.3))' }} />
                    <h2 className="text-gold" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', margin: 0, letterSpacing: '0.05em' }}>KADIN INDONESIA</h2>
                    <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sinergi Membangun Negeri</span>
                </div>

                <nav className="flex-col gap-md" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        className={`btn ${activeTab === 'employees' ? 'btn-primary' : ''} `}
                        style={{ justifyContent: 'flex-start', background: activeTab === 'employees' ? '' : 'transparent', border: 'none', textAlign: 'left', color: activeTab === 'employees' ? '#000' : '#fff', fontWeight: 'bold' }}
                        onClick={() => setActiveTab('employees')}
                    >
                        <Users size={20} style={{ marginRight: '10px' }} /> Data Karyawan
                    </button>

                    <button
                        className={`btn ${activeTab === 'logs' ? 'btn-primary' : ''} `}
                        style={{ justifyContent: 'flex-start', background: activeTab === 'logs' ? '' : 'transparent', border: 'none', textAlign: 'left', color: activeTab === 'logs' ? '#000' : '#fff', fontWeight: 'bold' }}
                        onClick={() => setActiveTab('logs')}
                    >
                        <CreditCard size={20} style={{ marginRight: '10px' }} /> Access Logs
                    </button>

                    <button
                        className={`btn ${activeTab === 'simulation' ? 'btn-primary' : ''} `}
                        style={{ justifyContent: 'flex-start', background: activeTab === 'simulation' ? '' : 'transparent', border: 'none', textAlign: 'left', color: activeTab === 'simulation' ? '#000' : '#fff', fontWeight: 'bold' }}
                        onClick={() => setActiveTab('simulation')}
                    >
                        <ScanLine size={20} style={{ marginRight: '10px' }} /> Security Check
                    </button>

                    <button
                        className={`btn ${activeTab === 'performance' ? 'btn-primary' : ''} `}
                        style={{ justifyContent: 'flex-start', background: activeTab === 'performance' ? '' : 'transparent', border: 'none', textAlign: 'left', color: activeTab === 'performance' ? '#000' : '#fff', fontWeight: 'bold' }}
                        onClick={() => setActiveTab('performance')}
                    >
                        <BarChart2 size={20} style={{ marginRight: '10px' }} /> Grafik Performa
                    </button>
                </nav>

                <div style={{ marginTop: 'auto' }}>
                    <button
                        onClick={() => {
                            localStorage.removeItem('currentUser');
                            navigate('/login');
                        }}
                        className="btn"
                        style={{ justifyContent: 'flex-start', width: '100%', border: 'none', background: 'transparent', color: '#fff', fontWeight: 'bold' }}
                    >
                        <LogOut size={20} style={{ marginRight: '10px' }} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                {/* Top Header */}
                <header className="flex justify-between items-center" style={{ padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: '#1e293b' }}>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
                        {activeTab === 'employees' && 'Manajemen Karyawan'}
                        {activeTab === 'logs' && 'Log Akses Real-time'}
                        {activeTab === 'simulation' && 'Simulasi Akses Pintu'}
                        {activeTab === 'performance' && 'Grafik Performa Karyawan'}
                    </h2>
                    <div className="flex items-center gap-md">
                        <div className="flex items-center" style={{ background: '#0f172a', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                            <Search size={18} className="text-muted" />
                            <input
                                type="text"
                                placeholder="Search data..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: '#fff', marginLeft: '10px', outline: 'none' }}
                            />
                        </div>
                        {currentUser && (
                            <div
                                onClick={() => {
                                    setActiveTab('logs');
                                    setLogFilter('security');
                                }}
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
                            </div>
                        )}
                        {currentUser && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                    {currentUser.name.charAt(0)}
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
                                <h3 style={{ color: '#fff', margin: 0 }}>Access Logs</h3>
                                <div className="flex gap-sm">
                                    <button
                                        onClick={() => setLogFilter('all')}
                                        className="btn"
                                        style={{
                                            padding: '0.5rem 1rem',
                                            background: logFilter === 'all' ? 'var(--color-primary)' : 'transparent',
                                            color: logFilter === 'all' ? '#000' : '#fff',
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
                                            color: '#fff',
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
                                            background: '#0f172a',
                                            border: '1px solid var(--color-border)',
                                            color: '#fff',
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
                                            color: '#000',
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
                                                            src={simResult.detail.photo}
                                                            alt={simResult.detail.name}
                                                            loading="lazy"
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    </div>

                                                    {/* Details */}
                                                    <div style={{ textAlign: 'center' }}>
                                                        <h2 style={{ color: '#fff', margin: '0 0 0.5rem', fontSize: '1.75rem' }}>{simResult.detail.name}</h2>
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
                                    ANDA BELUM TERDAFTAR
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

                            {/* Header for Table + Add Button */}
                            {activeTab === 'employees' && isAuthorized && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
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
                                            {employees.filter(emp =>
                                                emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                emp.position.toLowerCase().includes(searchQuery.toLowerCase())
                                            ).map(emp => (
                                                <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
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
                                                            <button onClick={() => openEditCardModal(emp)} style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '0.5rem' }} title="Update Keycard">
                                                                <CreditCard size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteEmployee(emp.id)}
                                                                style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.5rem' }}
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
                                                                color: log.status === 'Granted' ? '#4ade80' : '#f87171',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                {log.status === 'Granted' ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
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
                                                <div style={{ width: '12px', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}></div> Absen
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

                                            return (
                                                <div key={day} style={{
                                                    aspectRatio: '1/1',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: isOvertime ? 'rgba(59, 130, 246, 0.3)' : (isPresent ? (isLate ? '#eab308' : '#10b981') : 'rgba(255,255,255,0.05)'),
                                                    borderRadius: '8px',
                                                    color: (isPresent || isOvertime) ? '#000' : '#fff',
                                                    fontWeight: isPresent || isToday || isOvertime ? 'bold' : 'normal',
                                                    border: isToday ? '2px solid var(--color-primary)' : 'none',
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

                                            // Working Days in Jan 2026 (Mon-Fri)
                                            const workingDays = [
                                                1, 2, 5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 26, 27, 28, 29, 30
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

                                            // Count overtime days (weekends)
                                            const overtimeDays = overtimeRecords.filter(d => d.startsWith('2026-01')).length;

                                            // Calculate weighted performance: on-time = 100%, late = 95%, overtime = +5% bonus each
                                            const totalScore = (ontimeDays * 1.0) + (lateDays * 0.95) + (overtimeDays * 0.05);
                                            const percentage = Math.round((totalScore / workingDays.length) * 100);

                                            return (
                                                <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto' }}>
                                                    <div style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        borderRadius: '50%',
                                                        background: `conic-gradient(#10b981 ${percentage}%, rgba(255,255,255,0.05) 0)`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        {/* Inner Circle (Donut hole) */}
                                                        <div style={{
                                                            width: '75%',
                                                            height: '75%',
                                                            borderRadius: '50%',
                                                            background: '#1e293b', // Matches glass-card background
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
                                                        }}>
                                                            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>{percentage}%</span>
                                                            <span className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Hadir</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div style={{ marginTop: '2rem', textAlign: 'left' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span className="text-muted">Total Hari Kerja</span>
                                                <span style={{ color: '#fff' }}>22 Hari</span>
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
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(5px)' }}>
                            <div className="glass-card animate-fade-in" style={{ padding: '2rem', maxWidth: '500px', width: '100%', border: '1px solid var(--color-border)', maxHeight: '90vh', overflowY: 'auto' }}>
                                <div className="flex justify-between items-center mb-lg">
                                    <h2 className="text-gold" style={{ margin: 0 }}>
                                        {editingEmployee ? 'Update Keycard' : (addStep === 1 ? 'Tambah Karyawan' : 'Validasi RFID / Keycard')}
                                    </h2>
                                    <button onClick={resetModal} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
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
                                                style={{ fontSize: '0.9rem', color: '#fff', width: '200px' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }} className="text-muted">Nama Lengkap</label>
                                            <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: '#0f172a', color: '#fff' }} className="w-full" />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }} className="text-muted">Posisi / Jabatan</label>
                                            <input type="text" required value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: '#0f172a', color: '#fff' }} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-md">
                                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }} className="text-muted">Divisi</label>
                                                <input type="text" required value={formData.division} onChange={e => setFormData({ ...formData, division: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: '#0f172a', color: '#fff' }} />
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
                                            <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                                                <p className="text-muted" style={{ fontSize: '0.9rem' }}>Mengubah kartu untuk:</p>
                                                <h3 style={{ margin: '0.5rem 0 0', color: 'var(--color-primary)' }}>{editingEmployee.name}</h3>
                                                <p style={{ margin: 0, fontSize: '0.8rem' }}>Current: {editingEmployee.keycard}</p>
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
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }} className="text-muted">Set Status</label>
                                                    <select
                                                        value={formData.status || 'Active'}
                                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: '#0f172a', color: '#fff' }}
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
                                                placeholder="Waiting for input..."
                                                autoFocus
                                                style={{
                                                    width: '100%',
                                                    padding: '1rem',
                                                    textAlign: 'center',
                                                    background: '#000',
                                                    border: '1px solid var(--color-border)',
                                                    color: 'var(--color-primary)',
                                                    fontFamily: 'monospace',
                                                    fontSize: '1.2rem',
                                                    borderRadius: '8px',
                                                    marginBottom: '1.5rem'
                                                }}
                                            />
                                            <div className="flex gap-md">
                                                <button type="button" onClick={editingEmployee ? resetModal : () => setAddStep(1)} className="btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--text-muted)', color: '#fff', fontWeight: 'bold' }}>{editingEmployee ? 'Batal' : 'Kembali'}</button>
                                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Validasi & Simpan</button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

            </main>
        </div>
    );
};

export default Dashboard;
