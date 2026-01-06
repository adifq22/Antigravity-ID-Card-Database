import React, { useEffect, useRef, useState } from 'react';
import { Users, CreditCard, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const images = ['/banners/banner1.jpg', '/banners/banner2.jpg', '/banners/banner3.png'];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }, 5000); // Change every 5 seconds

        // Scroll Reveal Logic
        const observerOptions = {
            threshold: 0.15
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, observerOptions);

        const revealedElements = document.querySelectorAll('.reveal');
        revealedElements.forEach(el => observer.observe(el));

        return () => {
            clearInterval(interval);
            revealedElements.forEach(el => observer.unobserve(el));
        };
    }, []);

    return (
        <div className="page-transition">
            <style>{`
                @keyframes fadeZoom {
                    0% { opacity: 0; transform: scale(1); }
                    10% { opacity: 0.2; }
                    90% { opacity: 0.2; }
                    100% { opacity: 0; transform: scale(1.1); }
                }
            `}</style>
            {/* Header Placeholder */}
            <header className="glass-card" style={{ position: 'fixed', top: 0, width: '100%', zIndex: 1000, padding: '1rem 0' }}>
                <div className="container flex justify-between items-center">
                    <div className="flex items-center gap-md">
                        <img src="/kadin-logo.png" alt="Kadin Logo" style={{ height: '50px', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.5))' }} />
                        <h1 className="text-gold" style={{ margin: 0, fontSize: '1.8rem' }}>KADIN INDONESIA</h1>
                    </div>
                    <nav>
                        <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>Login Platform</Link>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <section className="flex items-center justify-center text-center" style={{ minHeight: '100vh', paddingTop: '80px', position: 'relative', overflow: 'hidden' }}>

                {/* Background Carousel */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}>
                    {images.map((img, index) => (
                        <div key={index} style={{
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                            backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center',
                            opacity: index === currentImageIndex ? 0.8 : 0,
                            transition: 'opacity 1.5s ease-in-out',
                            transform: index === currentImageIndex ? 'scale(1.05)' : 'scale(1)',
                            transition: 'opacity 1.5s ease-in-out, transform 6s ease-out'
                        }}></div>
                    ))}
                    {/* Overlay Gradient for readability */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'radial-gradient(circle at center, rgba(253, 251, 247, 0.85) 0%, rgba(253, 251, 247, 0.6) 100%)'
                    }}></div>
                </div>

                <div className="container animate-fade-in" style={{ position: 'relative', zIndex: 1 }}>
                    <h2 className="text-gold" style={{ fontSize: '1.25rem', marginBottom: '1rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                        Portal Login Karyawan
                    </h2>
                    <h1 className="text-gold" style={{ fontSize: '4.5rem', marginBottom: '1.5rem', fontFamily: 'var(--font-heading)', fontWeight: '800', lineHeight: 1.1 }}>
                        <span style={{ color: 'var(--color-heading)' }}>KADIN</span> INDONESIA
                    </h1>
                    <p className="text-muted" style={{ fontSize: '1.5rem', maxWidth: '700px', margin: '0 auto 3rem', fontWeight: '300', letterSpacing: '0.05em' }}>
                        "Sinergi Membangun Negeri"
                    </p>
                    <div className="flex justify-center gap-md">
                        <Link to="/login" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', textDecoration: 'none' }}>LOGIN</Link>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section className="section" style={{ background: 'var(--color-bg)' }}>
                <div className="container">
                    <div className="flex flex-col items-center text-center mb-lg">
                        <h2 className="text-gold" style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', marginBottom: '1rem' }}>Mengenai Platform</h2>
                        <p className="text-muted" style={{ maxWidth: '800px', lineHeight: '1.6' }}>
                            Sebagai organisasi pengusaha terbesar di Indonesia, Kadin Indonesia berkomitmen untuk mendigitalkan infrastruktur operasional.
                            Platform ini dirancang khusus untuk memusatkan data karyawan dan mengamankan akses fisik kantor pusat melalui teknologi kartu kunci digital yang terintegrasi.
                        </p>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="section" style={{ background: 'rgba(255,255,255,0.5)' }}>
                <div className="container">
                    <h2 className="text-center text-gold mb-lg" style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem' }}>Fitur Utama</h2>

                    <div className="grid grid-cols-3 gap-lg">
                        <div className="glass-card feature-card reveal reveal-left">
                            <div className="text-primary mb-md">
                                <Users size={32} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Database Karyawan</h3>
                            <p className="text-muted">Manajemen data terpadu untuk seluruh staf Kadin Indonesia dengan profil digital lengkap.</p>
                        </div>

                        <div className="glass-card feature-card reveal reveal-bottom">
                            <div className="text-primary mb-md">
                                <CreditCard size={32} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Akses Smart Key</h3>
                            <p className="text-muted">Integrasi kartu akses digital untuk keamanan gedung yang lebih baik dan termonitor.</p>
                        </div>

                        <div className="glass-card feature-card reveal reveal-right">
                            <div className="text-primary mb-md">
                                <Activity size={32} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Real-time Monitoring</h3>
                            <p className="text-muted">Sistem pencatatan log akses karyawan secara real-time untuk audit keamanan visual.</p>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="text-center text-muted" style={{ padding: '2rem', borderTop: '1px solid var(--color-border)' }}>
                <p>&copy; {new Date().getFullYear()} Kadin Indonesia. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
