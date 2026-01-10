import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import ProductModal from './components/ProductModal';
import ProductCard from './components/ProductCard';
import PasswordModal from './components/PasswordModal';
import { notifyToast } from './components/Toast';
import { Toaster, toast } from 'sonner';
import RefillToast from './components/RefillToast';
import { logAudit, saveVenta, saveProducto, deleteVenta, deleteProducto, fetchProductos, fetchVentas, fetchStock, saveStock, saveGasto, fetchGastos, deleteGasto } from './firebase';
import {
  Plus, Trash2, TrendingUp, TrendingDown, Users, Calendar, Search, LogOut, Package, Droplets,
  ChevronRight, Menu, X, Check, ShoppingCart, User, Download, FileText, Wallet, Settings,
  Briefcase, CheckCircle, Smartphone, Banknote, CreditCard, Minus, Store, Truck, AlertTriangle
} from 'lucide-react';

// --- Datos Iniciales y Configuración ---

const PRODUCTOS_INICIALES = [
  { id: 1, nombre: 'Botellon 20L', precio: 150, icono: 'big', consumoLitros: 20 },
  { id: 2, nombre: 'Botellon 18L', precio: 150, icono: 'big', consumoLitros: 18 },
  { id: 3, nombre: 'Botellon 15L', precio: 120, icono: 'medium', consumoLitros: 15 },
  { id: 4, nombre: 'Botellon 12L', precio: 100, icono: 'small', consumoLitros: 12 },
  { id: 5, nombre: 'Botellon 8L', precio: 50, icono: 'small', consumoLitros: 8 },
  { id: 6, nombre: 'Botella 5L', precio: 50, icono: 'small', consumoLitros: 5 },
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

const MAX_TANQUE_LITROS = 6000;
const REFILL_AMOUNT = 6000;

const WaterRefillSystem = () => {
  // --- Estados de la Aplicación ---
  const [vistaActual, setVistaActual] = useState('productos');
  const [carrito, setCarrito] = useState([]);
  const [productos, setProductos] = useState(PRODUCTOS_INICIALES);
  const [stockLitros, setStockLitros] = useState(6000);
  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);
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

  // Estados para Admin Tabs
  const [adminTab, setAdminTab] = useState('reportes'); // reportes, deudas, gastos

  // Estados para Gastos
  const [gastoDescripcion, setGastoDescripcion] = useState('');
  const [gastoMonto, setGastoMonto] = useState('');
  const [gastoCategoria, setGastoCategoria] = useState('Proveedor');
  const [gastoReferencia, setGastoReferencia] = useState('');

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

    fetchGastos().then(items => {
      if (!mounted) return;
      if (items && items.length) setGastos(items);
    }).catch(err => {
      console.warn('fetchGastos failed', err);
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
            openPasswordModal({ type: 'REFILL_STOCK', payload: amount });
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

  // Estado para modal de contraseña
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  // passwordActionPending: { type: 'DELETE_VENTA' | 'REFILL_STOCK', payload: any }
  const [passwordActionPending, setPasswordActionPending] = useState(null);

  const openPasswordModal = (action) => {
    setPasswordActionPending(action);
    setPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setPasswordActionPending(null);
    setPasswordModalOpen(false);
  };

  const handlePasswordConfirm = (pwd) => {
    // contraseña esperada
    if ((pwd || '').trim() !== 'dosde3.agua') {
      notifyToast('Contraseña incorrecta. Cancelado.', 'error');
      closePasswordModal();
      return;
    }

    // Auth success: execute pending action
    const action = passwordActionPending;
    closePasswordModal();

    if (!action) return;

    if (action.type === 'DELETE_VENTA') {
      eliminarVentaPending(action.payload);
    } else if (action.type === 'REFILL_STOCK') {
      const amount = Number(action.payload);
      const nuevo = Math.max(0, (Number(stockLitros) || 0) + amount);
      setStockLitros(nuevo);
      saveStock({ liters: nuevo })
        .then(() => {
          notifyToast(`Tanque recargado +${amount} L (total ${nuevo} L)`, 'info');
          logAudit({
            action: 'stock_recharged',
            user: adminUsuario,
            amount: amount,
            when: new Date().toISOString(),
          });
        })
        .catch((err) => {
          console.error('saveStock failed', err);
          notifyToast('Error al guardar stock', 'error');
        });
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



  const actualizarCantidad = (id, delta) => {
    setCarrito(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, cantidad: Math.max(0, item.cantidad + delta) };
      }
      return item;
    }).filter(item => item.cantidad > 0));
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
    openPasswordModal({ type: 'DELETE_VENTA', payload: id });
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
            {productos.map(prod => {
              const itemEnCarrito = carrito.find(i => i.id === prod.id);
              const cantidad = itemEnCarrito ? itemEnCarrito.cantidad : 0;

              return (
                <ProductCard
                  key={prod.id}
                  prod={prod}
                  cantidad={cantidad}
                  onAdd={agregarAlCarrito}
                  onDecrement={(id) => actualizarCantidad(id, -1)}
                  onDeleteCatalog={eliminarProductoCatalogo}
                />
              );
            })}
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
        <h2><ShoppingCart size={22} strokeWidth={2.5} /> Tu Pedido</h2>
        <span className="cart-badge">{cantidadItemsCarrito} ítems</span>
      </div>

      <div className="cart-items">
        {carrito.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', padding: '3rem' }}>
            <div style={{ background: '#f1f5f9', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
              <ShoppingCart size={40} style={{ opacity: 0.5 }} />
            </div>
            <p style={{ fontSize: '1.1rem', fontWeight: '500', margin: 0 }}>Tu carrito está vacío</p>
            <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>¡Agrega productos para comenzar!</p>
            <button
              onClick={() => setVistaActual('productos')}
              style={{ color: 'var(--color-primary-600)', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              Ir al Catálogo <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          carrito.map(item => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-info">
                <div className="cart-item-name">{item.nombre}</div>
                <div className="cart-item-price">${item.precio.toFixed(2)} / ud</div>
              </div>

              <div className="cart-item-controls">
                <button onClick={() => actualizarCantidad(item.id, -1)} aria-label="Menos">
                  <Minus size={14} strokeWidth={3} />
                </button>
                <span className="cart-item-quantity">{item.cantidad}</span>
                <button onClick={() => actualizarCantidad(item.id, 1)} aria-label="Más">
                  <Plus size={14} strokeWidth={3} />
                </button>
              </div>

              <div className="cart-item-total">
                ${(item.precio * item.cantidad).toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="cart-summary">
        <div className="delivery-input-group">
          <Truck size={20} className="text-slate-400" style={{ marginRight: '0.75rem', color: '#64748b' }} />
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Delivery / Envío</label>
            <input
              type="text"
              inputMode='numeric'
              value={montoDelivery}
              onChange={(e) => setMontoDelivery(Number(e.target.value) || 0)}
              style={{ width: '100%', border: 'none', background: 'transparent', fontWeight: '600', color: '#0f172a', fontSize: '1rem', outline: 'none' }}
              placeholder="0.00"
            />
          </div>
          <span style={{ fontWeight: 'bold', color: '#94a3b8' }}>$</span>
        </div>

        <div className="summary-row">
          <span>Subtotal</span>
          <span>${totalCarrito.toFixed(2)}</span>
        </div>

        {montoDelivery > 0 && (
          <div className="summary-row" style={{ color: 'var(--color-primary-600)' }}>
            <span>+ Delivery</span>
            <span>${(Number(montoDelivery) || 0).toFixed(2)}</span>
          </div>
        )}

        <div className="summary-total">
          <span className="summary-total-label">Total a Pagar</span>
          <span className="summary-total-value">${totalConDelivery.toFixed(2)}</span>
        </div>

        <button
          onClick={() => setModalPagoAbierto(true)}
          disabled={carrito.length === 0}
          className="checkout-button"
        >
          Procesar Pago <ChevronRight size={20} strokeWidth={3} />
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

      <div className="module-container">
        <div className="module-header">
          <div>
            <h2 className="module-title">
              <Users size={24} className="text-blue-600" /> Cuentas por Cobrar
            </h2>
            <p className="module-subtitle">Gestión de créditos y pagos pendientes</p>
          </div>

          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} size={18} />
            <input
              type="text"
              placeholder="Buscar por cliente..."
              value={busquedaDeuda}
              onChange={(e) => setBusquedaDeuda(e.target.value)}
              className="modal-input"
              style={{ paddingLeft: '2.5rem', width: '250px' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.25rem' }}>
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

  const renderGastos = () => {
    const categorias = ['Proveedor', 'Servicios', 'Mantenimiento', 'Personal', 'Otros'];

    const agregarGasto = () => {
      if (!gastoDescripcion.trim() || !gastoMonto || Number(gastoMonto) <= 0) {
        notifyToast('Ingrese descripción y monto válido', 'error');
        return;
      }

      const nuevoGasto = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        descripcion: gastoDescripcion.trim(),
        monto: Number(gastoMonto),
        categoria: gastoCategoria,
        referencia: gastoReferencia.trim()
      };

      setGastos([nuevoGasto, ...gastos]);
      saveGasto(nuevoGasto).then(() => {
        notifyToast('Gasto registrado exitosamente', 'success');
      }).catch(err => {
        console.error('saveGasto failed', err);
        notifyToast('Error al guardar el gasto', 'error');
      });

      // Clear form
      setGastoDescripcion('');
      setGastoMonto('');
      setGastoReferencia('');
    };

    const handleEliminarGasto = (id) => {
      if (!confirm('¿Eliminar este gasto?')) return;
      setGastos(gastos.filter(g => g.id !== id));
      deleteGasto(id).catch(err => console.error('deleteGasto error', err));
      notifyToast('Gasto eliminado', 'info');
    };

    const totalGastosHoy = gastos
      .filter(g => new Date(g.fecha).toDateString() === new Date().toDateString())
      .reduce((sum, g) => sum + g.monto, 0);

    return (
      <div className="module-container">
        <div className="module-header">
          <div>
            <h2 className="module-title">
              <Wallet size={24} className="text-blue-600" /> Gastos y Proveedores
            </h2>
            <p className="module-subtitle">Registro de salidas de dinero</p>
          </div>
        </div>

        <div className="combined-layout" style={{ background: 'transparent', padding: 0 }}>
          {/* Formulario de Registro */}
          <div className="card" style={{ padding: '1.5rem', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', color: '#0f172a' }}>Registrar Gasto</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Descripción / Proveedor</label>
                <input
                  type="text"
                  value={gastoDescripcion}
                  onChange={(e) => setGastoDescripcion(e.target.value)}
                  placeholder="Ej. Compra de tapas, Pago de luz..."
                  className="modal-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Monto ($)</label>
                  <input
                    type="number"
                    value={gastoMonto}
                    onChange={(e) => setGastoMonto(e.target.value)}
                    placeholder="0.00"
                    className="modal-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Categoría</label>
                  <select
                    value={gastoCategoria}
                    onChange={(e) => setGastoCategoria(e.target.value)}
                    className="modal-input"
                    style={{ width: '100%' }}
                  >
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Referencia (Opcional)</label>
                <input
                  type="text"
                  value={gastoReferencia}
                  onChange={(e) => setGastoReferencia(e.target.value)}
                  placeholder="Nro Factura / Ref Pago"
                  className="modal-input"
                  style={{ width: '100%' }}
                />
              </div>

              <button
                onClick={agregarGasto}
                className="btn-action btn-primary"
                style={{ width: '100%' }}
              >
                <Plus size={18} />
                Registrar Gasto
              </button>
            </div>
          </div>

          {/* Listado y Resumen */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            {/* Card Resumen Hoy */}
            <div className="stats-card stats-card--red">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="stats-label" style={{ color: '#ef4444' }}>Total Gastos (Hoy)</p>
                  <p className="stats-value" style={{ color: '#b91c1c' }}>${totalGastosHoy.toFixed(2)}</p>
                </div>
                <TrendingDown size={32} className="text-red-300" />
              </div>
            </div>

            {/* Tabla Estandarizada */}
            <div className="table-container" style={{ flex: 1 }}>
              <div className="table-header">
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0 }}>Historial Reciente</h3>
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {gastos.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                    No hay gastos registrados
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Desc.</th>
                        <th>Cat.</th>
                        <th style={{ textAlign: 'right' }}>Monto</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {gastos.map(g => (
                        <tr key={g.id}>
                          <td style={{ color: 'var(--color-slate-500)' }}>
                            {new Date(g.fecha).toLocaleDateString()}
                          </td>
                          <td>
                            <div style={{ fontWeight: '500', color: 'var(--color-slate-900)' }}>{g.descripcion}</div>
                            {g.referencia && <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>Ref: {g.referencia}</div>}
                          </td>
                          <td>
                            <span className="status-badge status-badge--neutral">
                              {g.categoria}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>
                            -${g.monto.toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => handleEliminarGasto(g.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const renderReportes = () => {
    const totalVentas = ventas.reduce((sum, v) => sum + v.total, 0);
    const totalEfectivo = ventas.filter(v => v.metodo.includes('Efectivo')).reduce((sum, v) => sum + v.total, 0);
    const totalPagoMovil = ventas.filter(v => v.metodo.includes('Pago Móvil')).reduce((sum, v) => sum + v.total, 0);
    const totalDeudas = deudas.reduce((sum, d) => sum + d.total, 0);
    const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
    const gananciaNeta = totalVentas - totalGastos;

    return (
      <div className="module-container">
        <div className="module-header">
          <div>
            <h2 className="module-title">Reporte de Cierre</h2>
            <p className="module-subtitle">Resumen general del negocio</p>
          </div>
          <button
            onClick={descargarCSV}
            className="btn-action btn-primary"
          >
            <Download size={18} /> Exportar Excel
          </button>
        </div>

        <div className="stats-grid">
          <div className="stats-card stats-card--blue">
            <p className="stats-label">Ventas Totales</p>
            <p className="stats-value">${totalVentas.toFixed(2)}</p>
            <p className="stats-subtext">{ventas.length} transacciones</p>
          </div>
          <div className="stats-card stats-card--green">
            <p className="stats-label">Ganancia Neta</p>
            <p className="stats-value" style={{ color: gananciaNeta >= 0 ? '#166534' : '#dc2626' }}>${gananciaNeta.toFixed(2)}</p>
            <p className="stats-subtext">Ventas - Gastos</p>
          </div>
          <div className="stats-card stats-card--purple">
            <p className="stats-label">Métodos de Pago</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
              <span className="text-sm">💵 Efec: <strong>${totalEfectivo.toFixed(2)}</strong></span>
              <span className="text-sm">📱 Pago M: <strong>${totalPagoMovil.toFixed(2)}</strong></span>
              <span className="text-sm" style={{ color: '#991b1b' }}>📝 Crédito: <strong>${totalDeudas.toFixed(2)}</strong></span>
            </div>
          </div>
          <div className="stats-card stats-card--red">
            <p className="stats-label">Total Gastos</p>
            <p className="stats-value" style={{ color: '#ef4444' }}>${totalGastos.toFixed(2)}</p>
            <p className="stats-subtext">{gastos.length} registrados</p>
          </div>
        </div>

        <div className="table-container">
          <div className="table-header">
            <h3 style={{ fontWeight: 'bold', color: '#475569', margin: 0 }}>Movimientos Recientes</h3>
          </div>
          <div className="table-scroll-area">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Descripción / Cliente</th>
                  <th>Método</th>
                  <th>Referencia</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ventas.slice().reverse().map(v => (
                  <tr key={v.id} className={v.pendingDelete ? 'pending-delete-row' : ''} style={{ opacity: v.pendingDelete ? 0.6 : 1 }}>
                    <td style={{ color: '#94a3b8' }}>{new Date(v.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      <div style={{ fontWeight: '500', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{v.cliente}</span>
                        {v.pendingDelete && <span className="status-badge status-badge--pending">Eliminando...</span>}
                      </div>
                    </td>
                    <td>
                      <span className="status-badge status-badge--info">
                        {v.metodo}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>{v.referencia || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>${v.total.toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>
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
                  <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Sin movimientos registrados hoy</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderAdministracion = () => (
    <div className="admin-layout">
      <div className="admin-header">
        <h2 className="admin-title">
          <Briefcase size={20} className="text-blue-600" /> Administración
        </h2>
        <div className="admin-tabs">
          {[
            { id: 'reportes', label: 'Cierre', icon: FileText },
            { id: 'deudas', label: 'Deudas', icon: Users },
            { id: 'gastos', label: 'Gastos', icon: Wallet }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id)}
              className={`admin-tab-btn ${adminTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.id === 'deudas' && deudas.length > 0 && (
                <span className="status-badge status-badge--info" style={{ padding: '0 0.4rem', fontSize: '0.70rem', marginLeft: 'auto' }}>
                  {deudas.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="admin-content">
        {adminTab === 'reportes' && renderReportes()}
        {adminTab === 'deudas' && renderDeudas()}
        {adminTab === 'gastos' && renderGastos()}
      </div>
    </div>
  );

  // cleanup timers on unmount
  const renderInventario = () => {
    const porcentaje = Math.min(100, Math.max(0, (stockLitros / MAX_TANQUE_LITROS) * 100));
    const isCritical = stockLitros < 1000;

    return (
      <div className="module-container">
        <div className="module-header">
          <div>
            <h2 className="module-title">
              <Package size={24} className="text-blue-600" /> Gestión de Inventario
            </h2>
            <p className="module-subtitle">Monitoreo y recarga del tanque de agua</p>
          </div>
        </div>

        <div className="inventory-grid">
          {/* Main Tank Visual */}
          <div className="tank-card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#0f172a' }}>Nivel Actual</h3>

            <div className={`tank-visual-container ${isCritical ? 'critical' : ''}`}>
              <div
                className={`tank-liquid ${isCritical ? 'critical' : ''}`}
                style={{ height: `${porcentaje}%` }}
              />
            </div>

            <div className={`tank-measurement ${isCritical ? 'critical' : ''}`}>
              {Math.round(porcentaje)}%
            </div>
            <div className="tank-capacity-label">
              {stockLitros.toLocaleString()} / {MAX_TANQUE_LITROS.toLocaleString()} Litros
            </div>

            {isCritical && (
              <div style={{
                marginTop: '1.5rem',
                padding: '0.75rem 1rem',
                background: '#fee2e2',
                color: '#b91c1c',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertTriangle size={20} /> Nivel Crítico: Recargar pronto
              </div>
            )}
          </div>

          {/* Actions & Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="stats-card">
              <div className="stats-label">Capacidad Total</div>
              <div className="stats-value">{MAX_TANQUE_LITROS.toLocaleString()} L</div>
              <div className="stats-subtext">Volumen máximo del tanque</div>
            </div>

            <div className="stats-card">
              <div className="stats-label">Estado del Sistema</div>
              <div className="stats-value" style={{ color: isCritical ? '#dc2626' : '#16a34a' }}>
                {isCritical ? 'Requiere Atención' : 'Operativo'}
              </div>
              <div className="stats-subtext">
                {isCritical ? 'El nivel está por debajo del mínimo seguro' : 'Nivel de agua óptimo para ventas'}
              </div>
            </div>

            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Acciones</h3>
              <button
                onClick={recargarTanque}
                className="btn-primary-large"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Droplets size={24} /> Recargar Tanque (+{REFILL_AMOUNT}L)
              </button>
              <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
                Se requiere contraseña de administrador para realizar esta acción.
              </p>
            </div>
          </div>
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

            <div className="sidebar-section">Gestión</div>
            <button
              onClick={() => {
                setVistaActual('administracion');
                setSidebarAbierto(false);
              }}
              className={`sidebar-button ${vistaActual === 'administracion' ? 'active' : ''}`}
            >
              <Briefcase size={20} />
              <span>Administración</span>
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
            {/* Dashboard Mini-Header */}
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
        {vistaActual === 'administracion' && renderAdministracion()}
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
          onClick={() => setVistaActual('administracion')}
          className={`bottom-nav-item ${vistaActual === 'administracion' ? 'active' : ''}`}
        >
          <Briefcase size={24} />
          <span>Admin</span>
        </button>
      </nav>

      {/* Modales */}
      {modalPagoAbierto && renderModalPagoVenta()}
      {modalSaldarAbierto && renderModalSaldarDeuda()}
      {nuevoProductoModalOpen && <ProductModal open={true} onClose={cerrarModalNuevoProducto} onConfirm={handleProductModalConfirm} />}
      {passwordModalOpen && <PasswordModal open={true} onClose={closePasswordModal} onConfirm={handlePasswordConfirm} title={passwordActionPending?.type === 'REFILL_STOCK' ? "Confirmar Recarga" : "Confirmar Eliminación"} placeholder="Ingrese contraseña" info={passwordActionPending?.type === 'REFILL_STOCK' ? "Se modificará el inventario." : `La venta podrá deshacerse durante ${DELETE_UNDO_MS / 1000} segundos.`} />}
    </div>
  );
};

const AppContent = () => {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Login />;
  }
  return <WaterRefillSystem />;
}

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster richColors position="top-center" expand={true} />
    </AuthProvider>
  );
};

export default App;
