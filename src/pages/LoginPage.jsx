import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserX } from 'lucide-react';
import { MOCK_EMPLOYEES } from '../data/mockData';

const LoginPage = () => {
    const [employeeId, setEmployeeId] = useState('');
    const [showError, setShowError] = useState(false);
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();

        // Check if employee exists (from LocalStorage or Mock)
        const savedData = localStorage.getItem('kadin_employees');
        let employeeList = MOCK_EMPLOYEES;

        try {
            if (savedData) {
                employeeList = JSON.parse(savedData);
            }
        } catch (err) {
            console.error("Error loading saved data", err);
            // Fallback to mock is already set
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
            background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
        }}>

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
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '8px',
                                color: '#fff',
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
                    <button onClick={() => navigate('/')} className="" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#fff' }}>
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
