import React from 'react';

const LoadingSpinner = ({ size = 'md' }) => {
    const sizeMap = {
        sm: 'w-6 h-6',
        md: 'w-10 h-10',
        lg: 'w-16 h-16'
    };

    const pixelSize = {
        sm: '24px',
        md: '40px',
        lg: '64px'
    }[size];

    return (
        <div className="flex items-center justify-center p-md">
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spinner {
                    border: 3px solid rgba(212, 175, 55, 0.1);
                    border-top: 3px solid var(--color-primary);
                    border-radius: 50%;
                    animation: spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite;
                }
            `}</style>
            <div
                className="spinner"
                style={{ width: pixelSize, height: pixelSize }}
            />
        </div>
    );
};

export default LoadingSpinner;
