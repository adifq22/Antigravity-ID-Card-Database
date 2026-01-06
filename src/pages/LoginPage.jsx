import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserX } from 'lucide-react';
import { MOCK_EMPLOYEES } from '../data/mockData';
import { api } from '../services/api';

const LoginPage = () => {
    const [employeeId, setEmployeeId] = useState('');
    const [showError, setShowError] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

        let employeeList = [];

        // 1. Try API (Online)
        try {
            const apiData = await api.getEmployees();
            if (apiData) {
                employeeList = apiData;
            }
        } catch (e) {
            console.warn("API Offline, using local data");
        }

        // 2. Try LocalStorage V1 (New Standard)
        if (employeeList.length === 0) {
            const v1 = localStorage.getItem('kadin_integrated_db_v1');
            if (v1) {
                try {
                    employeeList = JSON.parse(v1);
                } catch (e) { console.error("V1 Data Corrupt"); }
            }
        }

        // 3. Try LocalStorage (Legacy)
        if (employeeList.length === 0) {
            const savedData = localStorage.getItem('kadin_employees');
            if (savedData) {
                try {
                    employeeList = JSON.parse(savedData);
                } catch (e) { console.error("Legacy Data Corrupt"); }
            }
        }

        // 4. Fallback to Mock
        if (employeeList.length === 0) {
            employeeList = MOCK_EMPLOYEES;
        }

        const isValid = employeeList.find(emp => emp.id === employeeId);

        if (isValid) {
            localStorage.setItem('currentUser', JSON.stringify(isValid));
            navigate('/dashboard');
        } else {
            setShowError(true);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.15), rgba(255, 255, 255, 1) 70%), linear-gradient(135deg, #fff 0%, #FDFBF7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Glowing Effect Background */}
            <div style={{
                position: 'absolute',
                top: '-10%',
                left: '-10%',
                width: '40%',
                height: '40%',
                background: 'radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 70%)',
                filter: 'blur(50px)',
                zIndex: 0
            }}></div>
            <div style={{
                position: 'absolute',
                bottom: '-10%',
                right: '-10%',
                width: '50%',
                height: '50%',
                background: 'radial-gradient(circle, rgba(243, 210, 80, 0.1) 0%, transparent 70%)',
                filter: 'blur(60px)',
                zIndex: 0
            }}></div>

            {/* Login Card */}
            <div className="glass-card animate-fade-in" style={{
                width: '100%',
                maxWidth: '400px',
                padding: '2.5rem',
                borderTop: '4px solid var(--color-primary)'
            }}>
                <div className="text-center mb-lg">
                    <h1 className="text-gold" style={{ fontFamily: 'var(--font-heading)', margin: '0 0 0.5rem' }}>LOGIN STAFF</h1>
                    <p className="text-muted">KADIN INDONESIA DATABASE SYSTEM</p>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-md">
                    <div>
                        <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Employee ID</label>
                        <input
                            type="text"
                            value={employeeId}
                            onChange={(e) => {
                                setEmployeeId(e.target.value);
                                setShowError(false);
                            }}
                            placeholder="Enter ID (e.g., KDN-001)"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'var(--color-input-bg)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '8px',
                                color: 'var(--color-text)',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        Access Portal
                    </button>
                </form>

                <div className="text-center mt-lg">
                    <button onClick={() => navigate('/')} className="" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                        &larr; Back to Landing Page
                    </button>
                </div>
            </div>

            {/* Error Modal / Pop-up */}
            {showError && (
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
                            <UserX size={32} />
                        </div>
                        <h3 style={{ color: '#fff', marginBottom: '1rem' }}>Akses Ditolak</h3>
                        <p className="text-muted" style={{ marginBottom: '2rem', lineHeight: '1.6' }}>
                            Anda Belum Terdaftar, Silahkan Kontak Bagian HR untuk segera mendaftarkan Anda
                        </p>
                        <button
                            className="btn"
                            onClick={() => setShowError(false)}
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
        </div>
    );
};

export default LoginPage;
