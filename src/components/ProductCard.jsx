import React, { useState, useRef } from 'react';
import { Plus, Minus, Droplets, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductCard({
    prod,
    cantidad,
    onAdd,
    onDecrement,
    onDeleteCatalog
}) {
    const [isPressed, setIsPressed] = useState(false);
    const timerRef = useRef(null);
    const isLongPress = useRef(false);

    const startPress = () => {
        setIsPressed(true);
        isLongPress.current = false;
        timerRef.current = setTimeout(() => {
            isLongPress.current = true;
            setIsPressed(false);
            // Trigger Long Press Action
            handleLongPress();
        }, 800); // 800ms threshold
    };

    const endPress = (e) => {
        // If we haven't reached long press yet, clear timer (it's a click)
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setIsPressed(false);

        // If it WAS a long press, prevent default click behavior
        if (isLongPress.current) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            return;
        }

        // Normal Click behavior handled by onClick
    };

    const handleClick = () => {
        if (isLongPress.current) {
            isLongPress.current = false; // Reset
            return;
        }
        onAdd(prod);
    };

    const handleLongPress = () => {
        if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
        // Confirm Deletion
        toast.custom((t) => (
            <div style={{
                padding: '1rem',
                background: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                border: '1px solid #fee2e2',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                minWidth: '250px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 'bold' }}>
                    <AlertTriangle size={20} />
                    <span>¿Eliminar del Catálogo?</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                    Se borrará "{prod.nombre}" permanentemente.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => toast.dismiss(t)}
                        style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            onDeleteCatalog(prod.id);
                            toast.dismiss(t);
                        }}
                        style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        ), { duration: 5000 });
    };

    return (
        <div
            className="product-card"
            onMouseDown={startPress}
            onMouseUp={endPress}
            onMouseLeave={endPress}
            onTouchStart={startPress}
            onTouchEnd={endPress}
            onClick={handleClick}
            style={{
                transform: isPressed ? 'scale(0.96)' : 'scale(1)',
                borderColor: isPressed ? 'var(--color-primary-300)' : undefined
            }}
            role="button"
            tabIndex={0}
        >
            {/* Badge de Cantidad */}
            {cantidad > 0 && (
                <span className="qty-badge">
                    {cantidad}
                </span>
            )}

            {/* Remove/Decrement Button (only visible if quantity > 0) */}
            <button
                className={`delete-button ${cantidad > 0 ? 'visible' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (cantidad > 0) {
                        onDecrement(prod.id);
                    }
                }}
                title="Quitar uno"
                aria-label="Quitar uno del carrito"
                style={{
                    opacity: cantidad > 0 ? 1 : 0,
                    pointerEvents: cantidad > 0 ? 'auto' : 'none',
                }}
            >
                <Minus size={14} />
            </button>

            <div className="product-content-wrapper">
                <div className="product-icon">
                    <Droplets size={32} />
                </div>
                <span className="product-name">{prod.nombre}</span>
                <span className="product-price">${prod.precio.toFixed(2)}</span>
            </div>

            <div className="product-action-footer">
                <Plus size={14} strokeWidth={3} /> Agregar
            </div>
        </div>
    );
}
