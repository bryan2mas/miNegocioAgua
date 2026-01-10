import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export default function PasswordModal({ open, onClose, onConfirm, title = 'Confirmar acción', placeholder = 'Contraseña', info = '' }) {
  const [value, setValue] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    // focus on mount
    setTimeout(() => ref.current?.focus(), 0);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') onConfirm(value);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, value, onClose, onConfirm]);

  if (!open) return null;

  return (
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <div className="modal-body">
          {info && <p className="modal-info-text">{info}</p>}
          <div className="modal-section">
            <label htmlFor="pwd-input">{placeholder}</label>
            <input
              id="pwd-input"
              ref={ref}
              type="password"
              className="modal-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
            />
          </div>
          <div className="modal-actions">
            <button className="modal-confirm-btn" onClick={() => onConfirm(value)}>Confirmar</button>
            <button className="modal-button" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
