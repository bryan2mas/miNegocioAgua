import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import ProductModal from './components/ProductModal';
import PasswordModal from './components/PasswordModal';
import { notifyToast } from './components/Toast';
import { Toaster, toast } from 'sonner';
import RefillToast from './components/RefillToast';
import { logAudit, saveVenta, saveProducto, deleteVenta, deleteProducto, fetchProductos, fetchVentas, fetchStock, saveStock } from './firebase';
import {
  ShoppingCart,
  Droplets,
  CreditCard,
  Users,
  FileText,
  Trash2,
  Plus,
  Minus,
  Search,
  Download,
  X,
  CheckCircle,
  Smartphone,
  Banknote,
  Store,
  Package
} from 'lucide-react';

// --- Datos Iniciales y Configuración ---

const PRODUCTOS_INICIALES = [
  { id: 1, nombre: 'Botellon 20L', precio: 100, icono: 'big', consumoLitros: 20 },
  { id: 2, nombre: 'Botellon 18L', precio: 100, icono: 'big', consumoLitros: 18 },
  { id: 3, nombre: 'Botellon 15L', precio: 80, icono: 'medium', consumoLitros: 15 },
  { id: 4, nombre: 'Botellon 12L', precio: 60, icono: 'small', consumoLitros: 12 },
  { id: 5, nombre: 'Botellon 8L', precio: 30, icono: 'small', consumoLitros: 8 },
  { id: 6, nombre: 'Botella 5L', precio: 30, icono: 'small', consumoLitros: 5 },
  { id: 7, nombre: 'Tapa Generica', precio: 10, icono: 'accessory', consumoLitros: 0 },
];

const METODOS_PAGO = {
  EFECTIVO: 'Efectivo',
  PAGO_MOVIL: 'Pago Móvil',
  CREDITO: 'Crédito'
};

const METODOS_PAGO_DEUDA = {
  EFECTIVO: 'Efectivo',
  PAGO_MOVIL: 'Pago Móvil'
};

const MAX_TANQUE_LITROS = 5000;

const WaterRefillSystem = () => {
  // --- Estados de la Aplicación ---
  const [vistaActual, setVistaActual] = useState('productos');
  const [carrito, setCarrito] = useState([]);
  const [productos, setProductos] = useState(PRODUCTOS_INICIALES);
  const [stockLitros, setStockLitros] = useState(5000);
  const [ventas, setVentas] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [montoDelivery, setMontoDelivery] = useState(0);

  // Estados para modales de Venta
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState(METODOS_PAGO.EFECTIVO);
  const [referenciaPago, setReferenciaPago] = useState('');
  const [clienteCredito, setClienteCredito] = useState('');

  // Estados para Deudas
  const [busquedaDeuda, setBusquedaDeuda] = useState('');
  const [modalSaldarAbierto, setModalSaldarAbierto] = useState(false);
  const [deudaSeleccionada, setDeudaSeleccionada] = useState(null);
  const [metodoSaldarSeleccionado, setMetodoSaldarSeleccionado] = useState(METODOS_PAGO_DEUDA.EFECTIVO);
  const [referenciaSaldar, setReferenciaSaldar] = useState('');

  // Estados para Mobile
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  // Estados para Nuevo Producto (modal)
  const [nuevoProductoModalOpen, setNuevoProductoModalOpen] = useState(false);

  // Admin usuario para auditoría
  const [adminUsuario] = useState('Admin');

  // Timers para eliminación con undo
  const deleteTimers = useRef({});
  const DELETE_UNDO_MS = 6000; // tiempo (ms) para permitir deshacer

  // On mount: try to load productos and ventas from Firestore
  useEffect(() => {
    let mounted = true;
    fetchProductos().then(items => {
      if (!mounted) return;
      if (items && items.length) {
        setProductos(items);
      } else {
        // if Firestore has no products yet, seed with initial products
        setProductos(PRODUCTOS_INICIALES);
        Promise.all(PRODUCTOS_INICIALES.map(p => saveProducto(p).catch(err => { console.warn('seed saveProducto failed', err); })))
          .then(() => notifyToast('Productos iniciales sembrados en Firestore', 'info'))
          .catch(() => { });
      }
    }).catch(err => {
      console.warn('fetchProductos failed', err);
    });

    fetchVentas().then(items => {
      if (!mounted) return;
      if (items && items.length) setVentas(items);
    }).catch(err => {
      console.warn('fetchVentas failed', err);
    });



    // load stock
    fetchStock().then(s => {
      if (!mounted) return;
      if (s && typeof s.liters === 'number') setStockLitros(s.liters);
      else if (s && s.liters) setStockLitros(Number(s.liters));
    }).catch(err => console.warn('fetchStock failed', err));

    return () => { mounted = false; };
  }, []);

  const recargarTanque = () => {
    toast.custom(
      (t) => (
        <RefillToast
          t={t}
          currentStock={stockLitros}
          onConfirm={(amount) => {
            const add = Number(amount);
            const nuevo = Math.max(0, (Number(stockLitros) || 0) + add);
            setStockLitros(nuevo);
            saveStock({ liters: nuevo })
              .then(() => {
                notifyToast(`Tanque recargado +${add} L (total ${nuevo} L)`, 'info');
                logAudit({
                  action: 'stock_recharged',
                  user: adminUsuario,
                  amount: add,
                  when: new Date().toISOString(),
                });
              })
              .catch((err) => {
                console.error('saveStock failed', err);
                notifyToast('Error al guardar stock', 'error');
              });
          }}
        />
      ),
      { duration: Infinity, position: 'top-center' }
    );
  };

  const getConsumoFromNombre = (nombre) => {
    if (!nombre) return 0;
    const n = nombre.toString().toLowerCase();
    const m = n.match(/(\d+)\s*l/); // like '20L' or '20 l'
    if (m && m[1]) return Number(m[1]);

    return 0;
  };

  // Estado para modal de contraseña antes de eliminar
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTargetVenta, setPasswordTargetVenta] = useState(null);

  const openPasswordModalForVenta = (id) => {
    setPasswordTargetVenta(id);
    setPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setPasswordTargetVenta(null);
    setPasswordModalOpen(false);
  };

  const handlePasswordConfirm = (pwd) => {
    // contraseña esperada
    if ((pwd || '').trim() !== 'dosde3.agua') {
      notifyToast('Contraseña incorrecta. Eliminación cancelada.', 'error');
      closePasswordModal();
      return;
    }
    // procede a marcar y programar eliminación
    const id = passwordTargetVenta;
    closePasswordModal();
    if (id) {
      // reuse existing logic by calling eliminarVentaPending
      eliminarVentaPending(id);
    }
  };

  // función que realiza la marcación y programación (se separa de UI de contraseña)
  const eliminarVentaPending = (id) => {
    const venta = ventas.find(v => v.id === id);
    if (!venta) return;

    // marcar como pendiente de eliminación
    setVentas(prev => prev.map(v => v.id === id ? { ...v, pendingDelete: true } : v));

    // programar eliminación final
    const timer = setTimeout(() => {
      setVentas(prev => prev.filter(v => v.id !== id));
      deleteTimers.current[id] = null;
      // toast de confirmación y auditoría (Firestore)
      const ahoraISO = new Date().toISOString();
      // attempt to delete venta document and log audit
      deleteVenta(id).catch(err => console.warn('deleteVenta failed', err));
      logAudit({
        action: 'venta_deleted',
        ventaId: id,
        user: adminUsuario,
        amount: venta?.total ?? null,
        note: 'Eliminación definitiva desde UI',
        when: ahoraISO
      }).catch(err => console.error('logAudit failed', err));
      notifyToast(`Venta eliminada definitivamente`, 'info', 4000);
    }, DELETE_UNDO_MS);
    deleteTimers.current[id] = timer;

    // acción para deshacer
    const restore = () => {
      const t = deleteTimers.current[id];
      if (t) {
        clearTimeout(t);
        deleteTimers.current[id] = null;
      }
      setVentas(prev => prev.map(v => v.id === id ? ({ ...v, pendingDelete: false }) : v));
      notifyToast('Eliminación cancelada', 'info');
    };

    notifyToast('Venta marcada para eliminación', 'info', DELETE_UNDO_MS, { label: 'Deshacer', onClick: restore });
  };

  const abrirModalNuevoProducto = () => {

    setNuevoProductoModalOpen(true);
  };



  const cerrarModalNuevoProducto = () => {
    setNuevoProductoModalOpen(false);
  };



  // Handler para el modal externo (ProductModal)
  const handleProductModalConfirm = (nombre, precioStr) => {
    const nombreLimpio = (nombre || '').trim();
    const precio = parseFloat(precioStr);
    if (!nombreLimpio) {
      notifyToast('Ingrese el nombre del producto', 'error');
      return;
    }
    if (isNaN(precio) || precio < 0) {
      notifyToast('Ingrese un precio válido', 'error');
      return;
    }
    agregarProductoCatalogo(nombreLimpio, precio);
    notifyToast(`Producto "${nombreLimpio}" agregado`, 'info');
    cerrarModalNuevoProducto();
  };

  // --- Lógica del Carrito ---

  const agregarAlCarrito = (producto) => {
    const itemExistente = carrito.find(item => item.id === producto.id);
    if (itemExistente) {
      setCarrito(carrito.map(item =>
        item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
      ));
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.id !== id));
  };

  const actualizarCantidad = (id, delta) => {
    setCarrito(carrito.map(item => {
      if (item.id === id) {
        const nuevaCant = item.cantidad + delta;
        return nuevaCant > 0 ? { ...item, cantidad: nuevaCant } : item;
      }
      return item;
    }));
  };

  // --- Gestión del Catálogo (CRUD básico) ---
  const agregarProductoCatalogo = (nombre, precio) => {
    if (!nombre || !nombre.trim()) return;
    const nuevo = {
      id: Date.now(),
      nombre: nombre.trim(),
      precio: parseFloat(precio) || 0,
      icono: 'small'
    };
    setProductos([nuevo, ...productos]);
    saveProducto(nuevo).then(() => {
      notifyToast(`Producto "${nuevo.nombre}" sincronizado con Firestore`, 'info');
    }).catch(err => {
      console.error('saveProducto failed', err);
      notifyToast('Error al sincronizar producto con Firestore', 'error');
    });
  };

  const eliminarProductoCatalogo = (id) => {
    if (!confirm('¿Eliminar este producto del catálogo?')) return;
    setProductos(productos.filter(p => p.id !== id));
    // También eliminar del carrito si estaba en él
    setCarrito(carrito.filter(c => c.id !== id));
    deleteProducto(id).then(() => {
      notifyToast('Producto eliminado de Firestore', 'info');
    }).catch(err => {
      console.error('deleteProducto failed', err);
      notifyToast('Error al eliminar producto en Firestore', 'error');
    });
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const cantidadItemsCarrito = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const totalConDelivery = totalCarrito + (Number(montoDelivery) || 0);

  // --- Lógica de Procesamiento de Venta Nueva ---

  const procesarVenta = () => {
    if (carrito.length === 0) return;

    const nuevaVenta = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      items: carrito,
      total: totalConDelivery,
      delivery: Number(montoDelivery) || 0,
      metodo: metodoPagoSeleccionado,
      referencia: metodoPagoSeleccionado === METODOS_PAGO.PAGO_MOVIL ? referenciaPago : null,
      cliente: metodoPagoSeleccionado === METODOS_PAGO.CREDITO ? clienteCredito : 'Contado'
    };

    // calcular litros requeridos por esta venta
    const litrosRequeridos = nuevaVenta.items.reduce((sum, it) => {
      const consumo = (it.consumoLitros != null) ? Number(it.consumoLitros) : getConsumoFromNombre(it.nombre);
      return sum + ((Number(it.cantidad) || 0) * (consumo || 0));
    }, 0);

    if (litrosRequeridos > (Number(stockLitros) || 0)) {
      notifyToast(`Stock insuficiente: faltan ${litrosRequeridos - (Number(stockLitros) || 0)} L`, 'error');
      return;
    }

    if (metodoPagoSeleccionado === METODOS_PAGO.CREDITO) {
      if (!clienteCredito.trim()) {
        notifyToast("Por favor ingrese el nombre del cliente para el crédito.", 'warning');
        return;
      }
      setDeudas([...deudas, { ...nuevaVenta, estado: 'pendiente', abonos: 0 }]);
      notifyToast(`Crédito registrado para ${clienteCredito}`, 'success');
    } else {
      if (metodoPagoSeleccionado === METODOS_PAGO.PAGO_MOVIL && !referenciaPago.trim()) {
        notifyToast("Por favor ingrese la referencia del pago móvil.", 'warning');
        return;
      }
      setVentas([...ventas, nuevaVenta]);
      // persist venta to Firestore
      saveVenta(nuevaVenta).then(() => {
        notifyToast('Venta guardada en Firestore', 'info');
      }).catch(err => {
        console.error('saveVenta failed', err);
        notifyToast('Error al guardar venta en Firestore', 'error');
      });
      // descontar del tanque y persistir
      const nuevoStock = Math.max(0, (Number(stockLitros) || 0) - litrosRequeridos);
      setStockLitros(nuevoStock);
      saveStock({ liters: nuevoStock }).then(() => {
        logAudit({ action: 'stock_decrement', user: adminUsuario, amount: litrosRequeridos, when: new Date().toISOString() });
      }).catch(err => console.warn('saveStock failed', err));

      notifyToast("Venta procesada con éxito!", 'success');
    }

    setCarrito([]);
    setModalPagoAbierto(false);
    setReferenciaPago('');
    setClienteCredito('');
    setMontoDelivery(0);
    setMetodoPagoSeleccionado(METODOS_PAGO.EFECTIVO);
  };

  // --- Lógica de Saldar Deuda ---

  const abrirModalSaldar = (deuda) => {
    setDeudaSeleccionada(deuda);
    setMetodoSaldarSeleccionado(METODOS_PAGO_DEUDA.EFECTIVO);
    setReferenciaSaldar('');
    setModalSaldarAbierto(true);
  };

  const confirmarSaldarDeuda = () => {
    if (!deudaSeleccionada) return;

    if (metodoSaldarSeleccionado === METODOS_PAGO_DEUDA.PAGO_MOVIL && !referenciaSaldar.trim()) {
      notifyToast("Por favor ingrese la referencia del pago.", 'warning');
      return;
    }

    const ventaSaldada = {
      ...deudaSeleccionada,
      fechaOriginal: deudaSeleccionada.fecha,
      fecha: new Date().toISOString(),
      metodo: `Pago Deuda (${metodoSaldarSeleccionado})`,
      referencia: referenciaSaldar,
      estado: 'pagado'
    };

    setVentas([...ventas, ventaSaldada]);
    setDeudas(deudas.filter(d => d.id !== deudaSeleccionada.id));

    setModalSaldarAbierto(false);
    setDeudaSeleccionada(null);
    notifyToast("Deuda saldada correctamente.", 'success');
    // persist saldada venta
    saveVenta(ventaSaldada).then(() => {
      notifyToast('Venta (saldada) guardada en Firestore', 'info');
    }).catch(err => {
      console.error('saveVenta (saldada) failed', err);
      notifyToast('Error al guardar venta saldada en Firestore', 'error');
    });
  };

  // --- Lógica de Reportes y Exportación ---

  const descargarCSV = () => {
    if (ventas.length === 0) {
      alert("No hay ventas para exportar.");
      return;
    }

    const headers = ["ID", "Fecha", "Cliente", "Metodo", "Referencia", "Total", "Items"];
    const rows = ventas.map(v => [
      v.id,
      new Date(v.fecha).toLocaleString(),
      v.cliente,
      v.metodo,
      v.referencia || '-',
      v.total.toFixed(2),
      v.items.map(i => `${i.cantidad}x ${i.nombre}`).join(' | ')
    ]);

    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cierre_ventas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Eliminar ventas (corrección por equivocación) ---
  // abrir modal de contraseña antes de iniciar eliminación (pendiente)
  const eliminarVenta = (id) => {
    openPasswordModalForVenta(id);
  };

  // --- Componentes Renderizados ---

  const renderProductos = () => (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {/* <div className="header-section">
        <h2>Catálogo de Productos</h2>
        <p>Seleccione los productos para añadir al pedido</p>
      </div> */}



      <div className="combined-layout">
        <div className="combined-products">
          <div className="products-grid">
            {productos.map(prod => (
              <div
                key={prod.id}
                className="product-card"
              >
                <button
                  className="add-button"
                  onClick={(e) => { e.stopPropagation(); agregarAlCarrito(prod); }}
                  aria-label={`Agregar ${prod.nombre}`}
                >
                  <Plus size={18} />
                </button>
                <button
                  className="delete-button"
                  onClick={(e) => { e.stopPropagation(); eliminarProductoCatalogo(prod.id); }}
                  title="Eliminar producto"
                  style={{ position: 'absolute', left: '0.5rem', top: '0.5rem', background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                >
                  <Trash2 size={14} />
                </button>
                <div className="product-icon">
                  <Droplets size={40} />
                </div>
                <span className="product-name">{prod.nombre}</span>
                <span className="product-price">${prod.precio.toFixed(2)}</span>
                <span className="product-hint">Agregar al carrito</span>
              </div>
            ))}
            <button
              style={{ borderStyle: 'dashed', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}
              className="product-card"
              onClick={abrirModalNuevoProducto}
            >
              <Plus size={32} />
              <span style={{ marginTop: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Nuevo Ítem</span>
            </button>
          </div>
        </div>
        <div className="combined-cart">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>Resumen del Pedido</h3>
            <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 'bold' }}>{cantidadItemsCarrito} ítems</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
            {carrito.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8' }}>Carrito vacío</p>
            ) : (
              carrito.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontWeight: '500', color: '#0f172a' }}>{item.nombre}</div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{item.cantidad} x ${item.precio.toFixed(2)}</div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#0f172a' }}>${(item.precio * item.cantidad).toFixed(2)}</div>
                </div>
              ))
            )}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a', display: 'block', marginBottom: '0.5rem' }}>Delivery</label>
            <input
              type="text"
              inputMode='numeric'
              value={montoDelivery}
              onChange={(e) => setMontoDelivery(Number(e.target.value) || 0)}
              className="modal-input"
              placeholder="0.00"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#64748b' }}>Subtotal</span>
              <span style={{ fontWeight: '500', color: '#0f172a' }}>${totalCarrito.toFixed(2)}</span>
            </div>
            {montoDelivery > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#64748b' }}>Delivery</span>
                <span style={{ fontWeight: '500', color: '#0f172a' }}>${(Number(montoDelivery) || 0).toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem', fontWeight: 'bold', color: '#0284c7', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
              <span>Total</span>
              <span>${totalConDelivery.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={() => setModalPagoAbierto(true)}
            disabled={carrito.length === 0}
            style={{ marginTop: '1rem', background: carrito.length === 0 ? '#cbd5e1' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: carrito.length === 0 ? 'not-allowed' : 'pointer', width: '100%' }}
          >
            Procesar Pago
          </button>
        </div>
      </div>
    </div>
  );

  const renderCarrito = () => (
    <div className="cart-container">
      <div className="cart-header">
        <h2><ShoppingCart size={24} /> Resumen del Pedido</h2>
        <span className="cart-badge">{cantidadItemsCarrito} ítems</span>
      </div>

      <div className="cart-items">
        {carrito.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#cbd5e1' }}>
            <ShoppingCart size={64} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p style={{ fontSize: '1.125rem' }}>El carrito está vacío</p>
            <button
              onClick={() => setVistaActual('productos')}
              style={{ marginTop: '1rem', color: '#0284c7', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Ir a Productos
            </button>
          </div>
        ) : (
          carrito.map(item => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-info">
                <div className="cart-item-details">
                  <div className="cart-item-name">{item.nombre}</div>
                  <div className="cart-item-price">${item.precio.toFixed(2)} unidad</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="cart-item-controls">
                  <button onClick={() => actualizarCantidad(item.id, -1)}><Minus size={16} /></button>
                  <span className="cart-item-quantity">{item.cantidad}</span>
                  <button onClick={() => actualizarCantidad(item.id, 1)}><Plus size={16} /></button>
                </div>
                <div style={{ width: '4.5rem', textAlign: 'right' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '1.125rem', color: '#0f172a' }}>${(item.precio * item.cantidad).toFixed(2)}</p>
                </div>
                <button onClick={() => eliminarDelCarrito(item.id)} style={{ padding: '0.5rem', color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '0.5rem', transition: 'background 0.25s ease' }} onMouseEnter={(e) => e.target.style.background = '#fee2e2'} onMouseLeave={(e) => e.target.style.background = 'transparent'}>
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <label style={{ fontSize: '1rem', fontWeight: '600', color: '#0f172a', flex: 1 }}>Delivery</label>
        <input
          type="text"
          inputMode='numeric'
          value={montoDelivery}
          onChange={(e) => setMontoDelivery(Number(e.target.value) || 0)}
          className="modal-input"
          placeholder="0.00"
          style={{ width: '5rem', padding: '0.5rem' }}
        />
      </div>

      <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Subtotal</span>
          <span style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: '500' }}>${totalCarrito.toFixed(2)}</span>
        </div>
        {montoDelivery > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Delivery</span>
            <span style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: '500' }}>${(Number(montoDelivery) || 0).toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
          <span style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>Total</span>
          <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0284c7' }}>${totalConDelivery.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ padding: '1.5rem' }}>
        <button
          onClick={() => setModalPagoAbierto(true)}
          disabled={carrito.length === 0}
          className="checkout-button"
          style={{ opacity: carrito.length === 0 ? 0.5 : 1, cursor: carrito.length === 0 ? 'not-allowed' : 'pointer' }}
        >
          Procesar Pago
        </button>
      </div>
    </div>
  );

  // --- Modales ---



  const renderModalPagoVenta = () => (
    <div className="modal" onClick={() => setModalPagoAbierto(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><CheckCircle size={20} /> Finalizar Venta</h3>
          <button className="modal-close-btn" onClick={() => setModalPagoAbierto(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ textAlign: 'center', marginBottom: '2rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', margin: '0 0 1rem 0' }}>Resumen de Pago</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <span style={{ color: '#64748b' }}>Subtotal</span>
              <span style={{ color: '#0f172a', fontWeight: '500' }}>${totalCarrito.toFixed(2)}</span>
            </div>

            {montoDelivery > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: '#64748b' }}>Delivery</span>
                <span style={{ color: '#0f172a', fontWeight: '500' }}>${(Number(montoDelivery) || 0).toFixed(2)}</span>
              </div>
            )}

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>Total</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0284c7' }}>${totalConDelivery.toFixed(2)}</span>
            </div>
          </div>

          <div className="modal-section">
            <p style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Método de Pago</p>
            <div className="modal-buttons">
              {[METODOS_PAGO.EFECTIVO, METODOS_PAGO.PAGO_MOVIL, METODOS_PAGO.CREDITO].map((metodo) => (
                <button
                  key={metodo}
                  onClick={() => setMetodoPagoSeleccionado(metodo)}
                  className={`modal-button ${metodoPagoSeleccionado === metodo ? 'active' : ''}`}
                >
                  {metodo === METODOS_PAGO.EFECTIVO && <Banknote size={24} />}
                  {metodo === METODOS_PAGO.PAGO_MOVIL && <Smartphone size={24} />}
                  {metodo === METODOS_PAGO.CREDITO && <CreditCard size={24} />}
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{metodo}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="modal-section">
            {metodoPagoSeleccionado === METODOS_PAGO.PAGO_MOVIL && (
              <div>
                <label className="modal-section" style={{ marginBottom: 0 }}>Referencia</label>
                <input
                  type="text"
                  autoFocus
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  className="modal-input"
                  placeholder="Número de referencia"
                />
              </div>
            )}

            {metodoPagoSeleccionado === METODOS_PAGO.CREDITO && (
              <div>
                <label className="modal-section" style={{ marginBottom: 0 }}>Nombre del Cliente</label>
                <input
                  type="text"
                  autoFocus
                  value={clienteCredito}
                  onChange={(e) => setClienteCredito(e.target.value)}
                  className="modal-input"
                  placeholder="Nombre y Apellido"
                />
              </div>
            )}
          </div>

          <button
            onClick={procesarVenta}
            className="modal-confirm-btn"
          >
            Confirmar Pago
          </button>
        </div>
      </div>
    </div>
  );

  const renderModalSaldarDeuda = () => (
    <div className="modal" onClick={() => setModalSaldarAbierto(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}>
          <h3><CheckCircle size={20} /> Saldar Deuda</h3>
          <button className="modal-close-btn" onClick={() => setModalSaldarAbierto(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: '500' }}>Cliente</span>
              <span style={{ fontWeight: '600', color: '#0f172a' }}>{deudaSeleccionada?.cliente}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: '500' }}>Monto Pendiente</span>
              <span style={{ fontSize: '1.875rem', fontWeight: '900', color: '#dc2626' }}>${deudaSeleccionada?.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="modal-section">
            <p style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Forma de Pago del Cliente</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {[METODOS_PAGO_DEUDA.EFECTIVO, METODOS_PAGO_DEUDA.PAGO_MOVIL].map((metodo) => (
                <button
                  key={metodo}
                  onClick={() => setMetodoSaldarSeleccionado(metodo)}
                  className={`modal-button ${metodoSaldarSeleccionado === metodo ? 'active' : ''}`}
                  style={{ gridColumn: 'auto' }}
                >
                  {metodo === METODOS_PAGO_DEUDA.EFECTIVO && <Banknote size={24} />}
                  {metodo === METODOS_PAGO_DEUDA.PAGO_MOVIL && <Smartphone size={24} />}
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{metodo}</span>
                </button>
              ))}
            </div>
          </div>

          {metodoSaldarSeleccionado === METODOS_PAGO_DEUDA.PAGO_MOVIL && (
            <div className="modal-section">
              <label className="modal-section" style={{ marginBottom: 0 }}>Referencia</label>
              <input
                type="text"
                autoFocus
                value={referenciaSaldar}
                onChange={(e) => setReferenciaSaldar(e.target.value)}
                className="modal-input"
                placeholder="Número de referencia"
              />
            </div>
          )}

          <button
            onClick={confirmarSaldarDeuda}
            className="modal-confirm-btn"
            style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}
          >
            Registrar Pago
          </button>
        </div>
      </div>
    </div>
  );

  const renderDeudas = () => {
    const deudasFiltradas = deudas.filter(d => d.cliente.toLowerCase().includes(busquedaDeuda.toLowerCase()));

    return (
      <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
              <Users style={{ color: '#0284c7' }} size={24} /> Cuentas por Cobrar
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem', margin: 0 }}>Gestión de créditos y pagos pendientes</p>
          </div>

          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} size={18} />
            <input
              type="text"
              placeholder="Buscar por cliente..."
              value={busquedaDeuda}
              onChange={(e) => setBusquedaDeuda(e.target.value)}
              className="modal-input"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {deudasFiltradas.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', opacity: 0.6 }}>
              <FileText size={48} style={{ marginBottom: '0.5rem' }} />
              <p>No se encontraron deudas pendientes</p>
            </div>
          ) : (
            deudasFiltradas.map(deuda => (
              <div key={deuda.id} className="card debt-card">
                <div className="debt-card-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.125rem', color: '#0f172a' }}>{deuda.cliente}</span>
                    <span style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#dc2626', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontWeight: '500' }}>Pendiente</span>
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <span style={{ background: '#f0f9ff', padding: '0 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>{new Date(deuda.fecha).toLocaleDateString()}</span>
                    <span>•</span>
                    <span style={{ fontStyle: 'italic' }}>{deuda.items.length} ítems</span>
                  </p>
                </div>

                <div className="debt-card-actions">
                  <div className="debt-card-total">
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Total Deuda</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>${deuda.total.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => abrirModalSaldar(deuda)}
                    className="btn-secondary"
                    style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem' }}
                  >
                    Saldar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderReportes = () => {
    const totalVentas = ventas.reduce((sum, v) => sum + v.total, 0);
    const totalEfectivo = ventas.filter(v => v.metodo.includes('Efectivo')).reduce((sum, v) => sum + v.total, 0);
    const totalPagoMovil = ventas.filter(v => v.metodo.includes('Pago Móvil')).reduce((sum, v) => sum + v.total, 0);
    const totalDeudas = deudas.reduce((sum, d) => sum + d.total, 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', height: '100%', paddingRight: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Reporte de Cierre</h2>
          <button
            onClick={descargarCSV}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Download size={18} /> Exportar Excel
          </button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <div className="card" style={{ borderColor: '#dbeafe' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Ventas Totales</p>
            <p style={{ fontSize: '2rem', fontWeight: '900', color: '#1e3a8a', marginTop: '0.5rem' }}>${totalVentas.toFixed(2)}</p>
            <p style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.25rem', fontWeight: '500', margin: 0 }}>{ventas.length} transacciones</p>
          </div>
          <div className="card" style={{ borderColor: '#dcfce7' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Efectivo en Caja</p>
            <p style={{ fontSize: '2rem', fontWeight: '900', color: '#166534', marginTop: '0.5rem' }}>${totalEfectivo.toFixed(2)}</p>
          </div>
          <div className="card" style={{ borderColor: '#e9d5ff' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Bancos / Pago Móvil</p>
            <p style={{ fontSize: '2rem', fontWeight: '900', color: '#6b21a8', marginTop: '0.5rem' }}>${totalPagoMovil.toFixed(2)}</p>
          </div>
          <div className="card" style={{ borderColor: '#fee2e2' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Créditos Pendientes</p>
            <p style={{ fontSize: '2rem', fontWeight: '900', color: '#991b1b', marginTop: '0.5rem' }}>${totalDeudas.toFixed(2)}</p>
            <p style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.25rem', fontWeight: '500', margin: 0 }}>{deudas.length} cuentas</p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <h3 style={{ fontWeight: 'bold', color: '#475569', margin: 0 }}>Movimientos Recientes</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead style={{ background: 'white', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Hora</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Descripción / Cliente</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Método</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Referencia</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '500' }}>Monto</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '500' }}>Acciones</th>
                </tr>
              </thead>
              <tbody style={{ borderTop: '1px solid #e2e8f0' }}>
                {ventas.slice().reverse().map(v => (
                  <tr key={v.id} className={v.pendingDelete ? 'pending-delete-row' : ''} style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc', opacity: v.pendingDelete ? 0.6 : 1 }}>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{new Date(v.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: '1rem', fontWeight: '500', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{v.cliente}</span>
                      {v.pendingDelete && <span style={{ fontSize: '0.75rem', background: '#fff7ed', color: '#b45309', padding: '0.125rem 0.5rem', borderRadius: '0.375rem', fontWeight: '700' }}>Eliminando...</span>}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        border: '1px solid #dbeafe',
                        background: '#eff6ff',
                        color: '#0284c7'
                      }}>
                        {v.metodo}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>{v.referencia || '-'}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>${v.total.toFixed(2)}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {v.pendingDelete ? (
                        <span style={{ color: '#f97316', fontWeight: '700' }}>Eliminando...</span>
                      ) : (
                        <button onClick={() => eliminarVenta(v.id)} title="Eliminar venta" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {ventas.length === 0 && (
                  <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Sin movimientos registrados hoy</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // cleanup timers on unmount
  const renderInventario = () => {
    const porcentaje = Math.min(100, Math.max(0, (stockLitros / MAX_TANQUE_LITROS) * 100));

    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={28} /> Gestión de Inventario
        </h2>

        <div className="card-dashboard" style={{ padding: '2rem', textAlign: 'center', background: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
          <h3 style={{ fontSize: '1.125rem', color: '#64748b', marginBottom: '1.5rem' }}>Nivel Actual del Tanque</h3>

          <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 2rem auto' }}>
            {/* Circular Indicator Placeholder - Using CSS for simplicity */}
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <path
                d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="4"
              />
              <path
                d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={stockLitros < 1000 ? '#ef4444' : '#3b82f6'}
                strokeWidth="4"
                strokeDasharray={`${porcentaje}, 100`}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a' }}>{Math.round(porcentaje)}%</span>
              <span style={{ fontSize: '1rem', color: '#64748b' }}>{stockLitros} L</span>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <p style={{ color: '#64748b', marginBottom: '0.5rem' }}>Capacidad Total: <strong>{MAX_TANQUE_LITROS} Litros</strong></p>
            {stockLitros < 1000 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#fee2e2', color: '#dc2626', borderRadius: 'full', fontWeight: 'bold', fontSize: '0.875rem' }}>
                ⚠️ Nivel Crítico de Agua
              </div>
            )}
          </div>

          <button
            onClick={recargarTanque}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 2rem',
              borderRadius: '0.5rem',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Droplets size={20} /> Recargar Tanque
          </button>
        </div>
      </div>
    );
  };

  // cleanup timers on unmount
  useEffect(() => {
    const timers = deleteTimers.current;
    return () => {
      Object.values(timers).forEach(t => { if (t) clearTimeout(t); });
    };
  }, []);

  return (
    <div className={`layout-container ${sidebarAbierto ? 'sidebar-open' : ''}`}>
      {/* Overlay para cerrar sidebar en mobile */}
      {sidebarAbierto && (
        <div
          className="hamburger-menu"
          onClick={() => setSidebarAbierto(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        />
      )}

      {/* Sidebar de Navegación */}
      <nav className={`sidebar ${sidebarAbierto ? 'open' : ''}`}>
        <div>
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <Droplets size={20} style={{ color: 'white' }} />
            </div>
            <span style={{ background: 'linear-gradient(135deg, #67e8f9 0%, #e0f2fe 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '900' }}>AquaPOS</span>
          </div>

          <div className="sidebar-nav">

            <div className="sidebar-section">Ventas</div>
            <button
              onClick={() => {
                setVistaActual('productos');
                setSidebarAbierto(false);
              }}
              className={`sidebar-button ${vistaActual === 'productos' ? 'active' : ''}`}
            >
              <Store size={20} />
              <span>Productos</span>
            </button>
            <button
              onClick={() => {
                setVistaActual('carrito');
                setSidebarAbierto(false);
              }}
              className={`sidebar-button ${vistaActual === 'carrito' ? 'active' : ''}`}
              style={{ position: 'relative' }}
            >
              <ShoppingCart size={20} />
              <span>Carrito</span>
              {cantidadItemsCarrito > 0 && (
                <span className="sidebar-badge">
                  {cantidadItemsCarrito}
                </span>
              )}
            </button>

            <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginLeft: '0.5rem', marginRight: '0.5rem' }}></div>

            <div className="sidebar-section">Inventario</div>
            <button
              onClick={() => {
                setVistaActual('inventario');
                setSidebarAbierto(false);
              }}
              className={`sidebar-button ${vistaActual === 'inventario' ? 'active' : ''}`}
            >
              <Package size={20} />
              <span>Inventario</span>
            </button>
            <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginLeft: '0.5rem', marginRight: '0.5rem' }}></div>

            <div className="sidebar-section">Administración</div>
            <button
              onClick={() => {
                setVistaActual('deudas');
                setSidebarAbierto(false);
              }}
              className={`sidebar-button ${vistaActual === 'deudas' ? 'active' : ''}`}
            >
              <Users size={20} />
              <span>Deudas</span>
              {deudas.length > 0 && (
                <span style={{ marginLeft: 'auto', background: '#1e3a8a', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
                  {deudas.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setVistaActual('reportes');
                setSidebarAbierto(false);
              }}
              className={`sidebar-button ${vistaActual === 'reportes' ? 'active' : ''}`}
            >
              <FileText size={20} />
              <span>Cierre</span>
            </button>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-avatar">AD</div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 'bold', margin: 0, truncate: 'true' }}>Admin</p>
            <p style={{ fontSize: '0.75rem', color: '#67e8f9', margin: 0, truncate: 'true' }}>Sucursal Principal</p>
          </div>
        </div>
      </nav>

      {/* Área Principal */}
      <main className="main-content">
        {vistaActual === 'productos' && (
          <div>
            <div className="stock-indicator-dashboard" style={{ padding: '0 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#64748b' }}>Nivel del Tanque</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#0f172a' }}>
                  {Math.round((stockLitros / MAX_TANQUE_LITROS) * 100)}% ({stockLitros} L)
                </span>
              </div>
              <div style={{ width: '100%', height: '0.75rem', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, (stockLitros / MAX_TANQUE_LITROS) * 100))}%`,
                    height: '100%',
                    background: stockLitros < 1000 ? '#ef4444' : '#3b82f6',
                    transition: 'width 0.5s ease'
                  }}
                />
              </div>
            </div>
            {renderProductos()}
          </div>
        )}
        {vistaActual === 'inventario' && renderInventario()}
        {vistaActual === 'carrito' && renderCarrito()}
        {vistaActual === 'deudas' && renderDeudas()}
        {vistaActual === 'reportes' && renderReportes()}
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="bottom-nav">
        <button
          onClick={() => setVistaActual('productos')}
          className={`bottom-nav-item ${vistaActual === 'productos' ? 'active' : ''}`}
        >
          <Store size={24} />
          <span>Tienda</span>
        </button>
        <button
          onClick={() => setVistaActual('inventario')}
          className={`bottom-nav-item ${vistaActual === 'inventario' ? 'active' : ''}`}
        >
          <Package size={24} />
          <span>Stock</span>
        </button>
        <button
          onClick={() => setVistaActual('carrito')}
          className={`bottom-nav-item ${vistaActual === 'carrito' ? 'active' : ''}`}
        >
          <ShoppingCart size={24} />
          <span>Carrito</span>
          {cantidadItemsCarrito > 0 && (
            <span className="bottom-nav-badge">
              {cantidadItemsCarrito}
            </span>
          )}
        </button>
        <button
          onClick={() => setVistaActual('deudas')}
          className={`bottom-nav-item ${vistaActual === 'deudas' ? 'active' : ''}`}
        >
          <Users size={24} />
          <span>Deudas</span>
        </button>
        <button
          onClick={() => setVistaActual('reportes')}
          className={`bottom-nav-item ${vistaActual === 'reportes' ? 'active' : ''}`}
        >
          <FileText size={24} />
          <span>Cierre</span>
        </button>
      </nav>

      {/* Modales */}
      {modalPagoAbierto && renderModalPagoVenta()}
      {modalSaldarAbierto && renderModalSaldarDeuda()}
      {nuevoProductoModalOpen && <ProductModal open={true} onClose={cerrarModalNuevoProducto} onConfirm={handleProductModalConfirm} />}
      {passwordModalOpen && <PasswordModal open={true} onClose={closePasswordModal} onConfirm={handlePasswordConfirm} title="Confirmar eliminación" placeholder="Ingrese contraseña" info={`La venta podrá deshacerse durante ${DELETE_UNDO_MS / 1000} segundos.`} />}
      <Toaster richColors position="top-center" expand={true} />
    </div>
  );
};

export default WaterRefillSystem;
