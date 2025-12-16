import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export default function ProductModal({ open, onClose, onConfirm, defaultName = '', defaultPrice = '' }) {
  const [name, setName] = useState(defaultName || '');
  const [price, setPrice] = useState(defaultPrice || '');
  const nameRef = useRef(null);

  useEffect(() => {
    if (open) {
      setName(defaultName || '');
      setPrice(defaultPrice || '');
      // focus first field
      setTimeout(() => nameRef.current?.focus(), 0);
    }
  }, [open, defaultName, defaultPrice]);

  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') onConfirm(name, price);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, name, price, onClose, onConfirm]);

  if (!open) return null;

  return (
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nuevo Producto</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="modal-section">
            <label htmlFor="pm-name">Nombre</label>
            <input
              id="pm-name"
              ref={nameRef}
              className="modal-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Botellón 20L"
            />
          </div>
          <div className="modal-section">
            <label htmlFor="pm-price">Precio</label>
            <input
              id="pm-price"
              className="modal-input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ej. 1.50"
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="modal-confirm-btn"
              onClick={() => onConfirm(name, price)}
            >Agregar</button>
            <button className="modal-button" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
