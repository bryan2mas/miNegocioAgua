import React, { useState } from 'react';
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
  Store
} from 'lucide-react';

// --- Datos Iniciales y Configuración ---

const PRODUCTOS_INICIALES = [
  { id: 1, nombre: 'Botellón 20L (Recarga)', precio: 1.5, icono: 'big' },
  { id: 2, nombre: 'Botellón 20L (Nuevo)', precio: 7.0, icono: 'big' },
  { id: 3, nombre: 'Galón 5L', precio: 0.75, icono: 'medium' },
  { id: 4, nombre: 'Botella 1.5L', precio: 0.5, icono: 'small' },
  { id: 5, nombre: 'Botella 600ml', precio: 0.3, icono: 'small' },
  { id: 6, nombre: 'Tapa Genérica', precio: 0.1, icono: 'accessory' },
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

const WaterRefillSystem = () => {
  // --- Estados de la Aplicación ---
  const [vistaActual, setVistaActual] = useState('productos'); // productos, carrito, deudas, reportes
  const [carrito, setCarrito] = useState([]);
  const [productos, setProductos] = useState(PRODUCTOS_INICIALES);
  
  // Base de datos simulada
  const [ventas, setVentas] = useState([]);
  const [deudas, setDeudas] = useState([]);

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

  const totalCarrito = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const cantidadItemsCarrito = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  // --- Lógica de Procesamiento de Venta Nueva ---

  const procesarVenta = () => {
    if (carrito.length === 0) return;

    const nuevaVenta = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      items: carrito,
      total: totalCarrito,
      metodo: metodoPagoSeleccionado,
      referencia: metodoPagoSeleccionado === METODOS_PAGO.PAGO_MOVIL ? referenciaPago : null,
      cliente: metodoPagoSeleccionado === METODOS_PAGO.CREDITO ? clienteCredito : 'Contado'
    };

    if (metodoPagoSeleccionado === METODOS_PAGO.CREDITO) {
      if (!clienteCredito.trim()) {
        alert("Por favor ingrese el nombre del cliente para el crédito.");
        return;
      }
      setDeudas([...deudas, { ...nuevaVenta, estado: 'pendiente', abonos: 0 }]);
      alert(`Crédito registrado para ${clienteCredito}`);
    } else {
      if (metodoPagoSeleccionado === METODOS_PAGO.PAGO_MOVIL && !referenciaPago.trim()) {
        alert("Por favor ingrese la referencia del pago móvil.");
        return;
      }
      setVentas([...ventas, nuevaVenta]);
      alert("Venta procesada con éxito!");
    }

    // Resetear estados
    setCarrito([]);
    setModalPagoAbierto(false);
    setReferenciaPago('');
    setClienteCredito('');
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
      alert("Por favor ingrese la referencia del pago.");
      return;
    }

    // Creamos el registro de ingreso por pago de deuda
    const ventaSaldada = { 
      ...deudaSeleccionada, 
      fechaOriginal: deudaSeleccionada.fecha, // Guardamos fecha original
      fecha: new Date().toISOString(), // Fecha del pago real
      metodo: `Pago Deuda (${metodoSaldarSeleccionado})`,
      referencia: referenciaSaldar,
      estado: 'pagado'
    };

    setVentas([...ventas, ventaSaldada]);
    setDeudas(deudas.filter(d => d.id !== deudaSeleccionada.id));
    
    setModalSaldarAbierto(false);
    setDeudaSeleccionada(null);
    alert("Deuda saldada correctamente.");
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
    link.setAttribute("download", `cierre_ventas_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Componentes Renderizados ---

  const renderProductos = () => (
    <div className="h-full overflow-y-auto">
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-lg">
          <h2 className="text-3xl font-bold mb-2">Catálogo de Productos</h2>
          <p className="text-blue-100 text-sm">Seleccione los productos para añadir al pedido</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {productos.map(prod => (
          <button
            key={prod.id}
            onClick={() => agregarAlCarrito(prod)}
            className="bg-white p-6 rounded-2xl shadow-md hover:shadow-2xl border-2 border-gray-100 hover:border-blue-400 transition-all flex flex-col items-center justify-center text-center group relative overflow-hidden hover:scale-105"
          >
            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full p-2 shadow-lg">
                <Plus size={18} />
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-full mb-4 group-hover:shadow-lg transition-all">
              <Droplets size={40} className="text-blue-600" />
            </div>
            <span className="font-bold text-gray-800 text-lg mb-2 line-clamp-2">{prod.nombre}</span>
            <span className="text-blue-600 font-extrabold text-2xl">${prod.precio.toFixed(2)}</span>
            <span className="text-xs text-gray-400 mt-2 font-medium group-hover:text-blue-500">Agregar al carrito</span>
          </button>
        ))}
         {/* Botón placeholder */}
         <button className="border-2 border-dashed border-gray-300 p-6 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-500 transition-all hover:bg-blue-50">
            <Plus size={32} />
            <span className="mt-2 font-medium text-sm">Nuevo Ítem</span>
          </button>
      </div>
    </div>
  );

  const renderCarrito = () => (
    <div className="h-full flex flex-col max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-blue-100">
      <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex justify-between items-center shadow-md">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart size={24} /> 
          Resumen del Pedido
        </h2>
        <span className="bg-white text-blue-600 py-2 px-4 rounded-full text-sm font-bold shadow-md">
          {cantidadItemsCarrito} ítems
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {carrito.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <ShoppingCart size={64} className="mb-4 opacity-20" />
            <p className="text-lg">El carrito está vacío</p>
            <button 
              onClick={() => setVistaActual('productos')}
              className="mt-4 text-blue-600 font-bold hover:underline"
            >
              Ir a Productos
            </button>
          </div>
        ) : (
          carrito.map(item => (
            <div key={item.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4 flex-1">
                <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
                  <Droplets size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{item.nombre}</h3>
                  <p className="text-sm text-gray-500">${item.precio.toFixed(2)} unidad</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-white border rounded-lg">
                  <button onClick={() => actualizarCantidad(item.id, -1)} className="p-2 hover:bg-gray-100 text-gray-600"><Minus size={16}/></button>
                  <span className="w-8 text-center font-bold">{item.cantidad}</span>
                  <button onClick={() => actualizarCantidad(item.id, 1)} className="p-2 hover:bg-gray-100 text-gray-600"><Plus size={16}/></button>
                </div>
                <div className="w-24 text-right">
                  <p className="font-bold text-lg text-gray-800">${(item.precio * item.cantidad).toFixed(2)}</p>
                </div>
                <button onClick={() => eliminarDelCarrito(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-6 bg-gray-50 border-t">
        <div className="flex justify-between items-center mb-6">
          <span className="text-gray-600 text-lg">Total a Pagar</span>
          <span className="text-3xl font-bold text-gray-900">${totalCarrito.toFixed(2)}</span>
        </div>
        <button 
          onClick={() => setModalPagoAbierto(true)}
          disabled={carrito.length === 0}
          className={`w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg transition-all transform hover:scale-[1.01] ${
            carrito.length === 0 ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          Procesar Pago
        </button>
      </div>
    </div>
  );

  // --- Modales ---

  const renderModalPagoVenta = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <CheckCircle size={20} /> Finalizar Venta
          </h3>
          <button onClick={() => setModalPagoAbierto(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="text-center">
            <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Total a Cobrar</p>
            <p className="text-5xl font-extrabold text-blue-600 mt-3">${totalCarrito.toFixed(2)}</p>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-gray-800 text-sm">Método de Pago</p>
            <div className="grid grid-cols-3 gap-3">
              {[METODOS_PAGO.EFECTIVO, METODOS_PAGO.PAGO_MOVIL, METODOS_PAGO.CREDITO].map((metodo) => (
                <button 
                  key={metodo}
                  onClick={() => setMetodoPagoSeleccionado(metodo)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-2 border-2 font-medium transition-all ${
                    metodoPagoSeleccionado === metodo 
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md' 
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {metodo === METODOS_PAGO.EFECTIVO && <Banknote size={24} />}
                  {metodo === METODOS_PAGO.PAGO_MOVIL && <Smartphone size={24} />}
                  {metodo === METODOS_PAGO.CREDITO && <CreditCard size={24} />}
                  <span className="text-xs font-bold">{metodo}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            {metodoPagoSeleccionado === METODOS_PAGO.PAGO_MOVIL && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Referencia</label>
                <input 
                  type="text" 
                  autoFocus
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-lg transition-colors"
                  placeholder="Número de referencia"
                />
              </div>
            )}

            {metodoPagoSeleccionado === METODOS_PAGO.CREDITO && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Cliente</label>
                <input 
                  type="text" 
                  autoFocus
                  value={clienteCredito}
                  onChange={(e) => setClienteCredito(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-lg transition-colors"
                  placeholder="Nombre y Apellido"
                />
              </div>
            )}
          </div>

          <button 
            onClick={procesarVenta}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 active:bg-blue-800 shadow-md hover:shadow-lg transition-all"
          >
            Confirmar Pago
          </button>
        </div>
      </div>
    </div>
  );

  const renderModalSaldarDeuda = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <CheckCircle size={20} /> Saldar Deuda
          </h3>
          <button onClick={() => setModalSaldarAbierto(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between mb-3">
              <span className="text-gray-500 text-sm font-medium">Cliente</span>
              <span className="font-semibold text-gray-800">{deudaSeleccionada?.cliente}</span>
            </div>
            <div className="flex justify-between items-end border-t border-gray-200 pt-3">
              <span className="text-gray-500 text-sm font-medium">Monto Pendiente</span>
              <span className="text-3xl font-extrabold text-red-500">${deudaSeleccionada?.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-gray-800 text-sm">Forma de Pago del Cliente</p>
            <div className="grid grid-cols-2 gap-3">
              {[METODOS_PAGO_DEUDA.EFECTIVO, METODOS_PAGO_DEUDA.PAGO_MOVIL].map((metodo) => (
                <button 
                  key={metodo}
                  onClick={() => setMetodoSaldarSeleccionado(metodo)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-2 border-2 font-medium transition-all ${
                    metodoSaldarSeleccionado === metodo 
                      ? 'border-green-600 bg-green-50 text-green-700 shadow-md' 
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-green-300'
                  }`}
                >
                  {metodo === METODOS_PAGO_DEUDA.EFECTIVO && <Banknote size={24} />}
                  {metodo === METODOS_PAGO_DEUDA.PAGO_MOVIL && <Smartphone size={24} />}
                  <span className="text-xs font-bold">{metodo}</span>
                </button>
              ))}
            </div>
          </div>

          {metodoSaldarSeleccionado === METODOS_PAGO_DEUDA.PAGO_MOVIL && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Referencia</label>
              <input 
                type="text" 
                autoFocus
                value={referenciaSaldar}
                onChange={(e) => setReferenciaSaldar(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-lg transition-colors"
                placeholder="Número de referencia"
              />
            </div>
          )}

          <button 
            onClick={confirmarSaldarDeuda}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 active:bg-green-800 shadow-md hover:shadow-lg transition-all"
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
      <div className="bg-white rounded-xl shadow-md h-full flex flex-col overflow-hidden">
        {/* Header de Deudas Mejorado */}
        <div className="p-6 border-b border-gray-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
             <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="text-blue-600" /> Cuentas por Cobrar
             </h2>
             <p className="text-sm text-gray-400 mt-1">Gestión de créditos y pagos pendientes</p>
          </div>
          
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            <input 
              type="text"
              placeholder="Buscar por cliente..."
              value={busquedaDeuda}
              onChange={(e) => setBusquedaDeuda(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none w-full md:w-72 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 p-4">
          {deudasFiltradas.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                <FileText size={48} className="mb-2" />
                <p>No se encontraron deudas pendientes</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {deudasFiltradas.map(deuda => (
                <div key={deuda.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg text-gray-800">{deuda.cliente}</span>
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Pendiente</span>
                    </div>
                    <p className="text-gray-500 text-sm flex items-center gap-2">
                        <span className="bg-gray-100 px-2 rounded text-xs">{new Date(deuda.fecha).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="italic">{deuda.items.length} ítems</span>
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                        <p className="text-xs text-gray-400">Total Deuda</p>
                        <p className="text-xl font-bold text-red-500">${deuda.total.toFixed(2)}</p>
                    </div>
                    <button 
                        onClick={() => abrirModalSaldar(deuda)}
                        className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 shadow-md transition-all active:scale-95"
                      >
                        Saldar
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
      <div className="space-y-6 overflow-y-auto h-full pr-2">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Reporte de Cierre</h2>
          <button 
            onClick={descargarCSV}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-shadow shadow font-medium"
          >
            <Download size={18} /> Exportar Excel
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-100">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Ventas Totales</p>
            <p className="text-3xl font-extrabold text-blue-900 mt-2">${totalVentas.toFixed(2)}</p>
            <p className="text-xs text-blue-500 mt-1 font-medium">{ventas.length} transacciones</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-green-100">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Efectivo en Caja</p>
            <p className="text-3xl font-extrabold text-green-700 mt-2">${totalEfectivo.toFixed(2)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-purple-100">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Bancos / Pago Móvil</p>
            <p className="text-3xl font-extrabold text-purple-700 mt-2">${totalPagoMovil.toFixed(2)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-red-100">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Créditos Pendientes</p>
            <p className="text-3xl font-extrabold text-red-600 mt-2">${totalDeudas.toFixed(2)}</p>
            <p className="text-xs text-red-400 mt-1 font-medium">{deudas.length} cuentas</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
             <h3 className="font-bold text-gray-700">Movimientos Recientes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-gray-400 border-b">
                <tr>
                  <th className="p-4 font-medium">Hora</th>
                  <th className="p-4 font-medium">Descripción / Cliente</th>
                  <th className="p-4 font-medium">Método</th>
                  <th className="p-4 font-medium">Referencia</th>
                  <th className="p-4 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ventas.slice().reverse().map(v => (
                  <tr key={v.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-4 text-gray-500">{new Date(v.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    <td className="p-4 font-medium text-gray-800">{v.cliente}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${
                        v.metodo.includes('Efectivo') 
                          ? 'bg-green-50 text-green-700 border-green-100' 
                          : v.metodo.includes('Móvil') 
                            ? 'bg-purple-50 text-purple-700 border-purple-100'
                            : 'bg-gray-50 text-gray-600'
                      }`}>
                        {v.metodo}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs text-gray-500">{v.referencia || '-'}</td>
                    <td className="p-4 text-right font-bold text-gray-800">${v.total.toFixed(2)}</td>
                  </tr>
                ))}
                {ventas.length === 0 && (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-400">Sin movimientos registrados hoy</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      {/* Sidebar de Navegación Rediseñado */}
      <nav className="w-20 lg:w-64 bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 text-white flex flex-col justify-between shrink-0 transition-all duration-300 shadow-2xl z-20">
        <div>
          <div className="p-6 flex items-center gap-3 font-bold text-xl border-b border-blue-700 bg-gradient-to-r from-blue-950 to-blue-900">
            <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-2 rounded-lg shadow-lg">
               <Droplets size={20} className="text-white" />
            </div>
            <span className="hidden lg:inline bg-gradient-to-r from-cyan-200 to-blue-200 bg-clip-text text-transparent font-black tracking-tight">AquaPOS</span>
          </div>
          
          <div className="mt-6 flex flex-col gap-2 px-3">
            <p className="px-3 text-xs font-bold text-blue-300 uppercase tracking-wider mb-1 hidden lg:block">Ventas</p>
            <button 
              onClick={() => setVistaActual('productos')}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                vistaActual === 'productos' 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-900/50 font-bold' 
                  : 'text-blue-200 hover:bg-blue-700/50 hover:text-white'
              }`}
            >
              <Store size={20} />
              <span className="hidden lg:inline font-medium">Productos</span>
            </button>
            <button 
              onClick={() => setVistaActual('carrito')}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all relative ${
                vistaActual === 'carrito' 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-900/50 font-bold' 
                  : 'text-blue-200 hover:bg-blue-700/50 hover:text-white'
              }`}
            >
              <ShoppingCart size={20} />
              <span className="hidden lg:inline font-medium">Carrito</span>
              {cantidadItemsCarrito > 0 && (
                <span className="absolute top-2 right-2 lg:top-3 lg:right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-blue-900 animate-pulse">
                  {cantidadItemsCarrito}
                </span>
              )}
            </button>

            <div className="my-2 border-t border-blue-700 mx-2"></div>

            <p className="px-3 text-xs font-bold text-blue-300 uppercase tracking-wider mb-1 hidden lg:block">Administración</p>
            <button 
              onClick={() => setVistaActual('deudas')}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                vistaActual === 'deudas' 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-900/50 font-bold' 
                  : 'text-blue-200 hover:bg-blue-700/50 hover:text-white'
              }`}
            >
              <Users size={20} />
              <span className="hidden lg:inline font-medium">Deudas</span>
              {deudas.length > 0 && (
                 <span className="hidden lg:flex ml-auto bg-blue-700 text-white text-xs font-bold px-2 py-0.5 rounded-md">
                   {deudas.length}
                 </span>
              )}
            </button>
            <button 
              onClick={() => setVistaActual('reportes')}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                vistaActual === 'reportes' 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-900/50 font-bold' 
                  : 'text-blue-200 hover:bg-blue-700/50 hover:text-white'
              }`}
            >
              <FileText size={20} />
              <span className="hidden lg:inline font-medium">Cierre</span>
            </button>
          </div>
        </div>
        
        <div className="p-4 bg-gradient-to-r from-blue-900 to-blue-800 border-t border-blue-700 hidden lg:flex items-center gap-3 shadow-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
            AD
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate">Admin</p>
            <p className="text-xs text-blue-300 truncate">Sucursal Principal</p>
          </div>
        </div>
      </nav>

      {/* Área Principal */}
      <main className="flex-1 p-4 lg:p-8 overflow-hidden relative bg-gradient-to-br from-blue-50 via-white to-blue-50">
        {vistaActual === 'productos' && renderProductos()}
        {vistaActual === 'carrito' && renderCarrito()}
        {vistaActual === 'deudas' && renderDeudas()}
        {vistaActual === 'reportes' && renderReportes()}
      </main>

      {/* Modales */}
      {modalPagoAbierto && renderModalPagoVenta()}
      {modalSaldarAbierto && renderModalSaldarDeuda()}
    </div>
  );
};

export default WaterRefillSystem;