import React, { useState } from 'react';
import { toast } from 'sonner';

export default function RefillToast({ t, currentStock, onConfirm }) {
    const [amount, setAmount] = useState('');

    const handleConfirm = () => {
        const val = Number(amount);
        if (!isNaN(val) && val > 0) {
            onConfirm(val);
            toast.dismiss(t);
        } else {
            toast.error('Ingrese una cantidad válida mayor a 0');
        }
    };

    return (
        <div style={{
            padding: '1rem',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0',
            minWidth: '250px'
        }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#0f172a' }}>Recargar Tanque</h4>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                Stock actual: <span style={{ fontWeight: 'bold', color: '#0369a1' }}>{currentStock} L</span>
            </p>

            <div style={{ marginBottom: '1rem' }}>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Litros a agregar..."
                    style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.375rem',
                        fontSize: '1rem'
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirm();
                        if (e.key === 'Escape') toast.dismiss(t);
                    }}
                />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                    onClick={() => toast.dismiss(t)}
                    style={{
                        padding: '0.5rem 0.75rem',
                        background: '#f1f5f9',
                        color: '#475569',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontWeight: '500'
                    }}
                >
                    Cancelar
                </button>
                <button
                    onClick={handleConfirm}
                    style={{
                        padding: '0.5rem 0.75rem',
                        background: '#0284c7',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontWeight: '500'
                    }}
                >
                    Confirmar
                </button>
            </div>
        </div>
    );
}
