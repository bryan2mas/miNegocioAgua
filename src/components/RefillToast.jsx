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
        <div className="toast-refill-container">
            <h4 className="toast-refill-title">Recargar Tanque</h4>
            <p className="toast-refill-subtitle">
                Stock actual: <span>{currentStock} L</span>
            </p>

            <div className="toast-refill-input-container">
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Litros a agregar..."
                    className="toast-refill-input"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirm();
                        if (e.key === 'Escape') toast.dismiss(t);
                    }}
                />
            </div>

            <div className="toast-refill-actions">
                <button
                    onClick={() => toast.dismiss(t)}
                    className="toast-refill-btn-cancel"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleConfirm}
                    className="toast-refill-btn-confirm"
                >
                    Confirmar
                </button>
            </div>
        </div>
    );
}
