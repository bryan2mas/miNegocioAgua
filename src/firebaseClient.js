// Firebase initialization and helpers (clean client file)
// IMPORTANT: Keep your config values in this file or use environment variables.

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';

// Replace with your project's Firebase config (or keep in firebase.js if you prefer)
const firebaseConfig = {
  apiKey: "AIzaSyBo2XZXWPdNxz4ro6TApn-1iE4mNt-WTIA",
  authDomain: "aguapos.firebaseapp.com",
  projectId: "aguapos",
  storageBucket: "aguapos.firebasestorage.app",
  messagingSenderId: "267670405324",
  appId: "1:267670405324:web:c30d69fae9231fb9014269"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export const auth = getAuth(app);

export async function logAudit(entry) {
  try {
    const auditsRef = collection(db, 'audits');
    const payload = { ...entry, createdAt: serverTimestamp() };
    const r = await addDoc(auditsRef, payload);
    return { id: r.id };
  } catch (err) {
    console.error('logAudit error', err);
    throw err;
  }
}

export async function saveVenta(venta) {
  try {
    if (!venta || !venta.id) throw new Error('venta must have id');
    const ventasRef = doc(db, 'ventas', String(venta.id));
    await setDoc(ventasRef, { ...venta, persistedAt: serverTimestamp() });
    return { id: venta.id };
  } catch (err) {
    console.error('saveVenta error', err);
    throw err;
  }
}

export async function deleteVenta(ventaId) {
  try {
    if (!ventaId) throw new Error('ventaId required');
    const ventaRef = doc(db, 'ventas', String(ventaId));
    await deleteDoc(ventaRef);
    return { id: ventaId };
  } catch (err) {
    console.error('deleteVenta error', err);
    throw err;
  }
}

export async function saveProducto(producto) {
  try {
    if (!producto || !producto.id) throw new Error('producto must have id');
    const productosRef = doc(db, 'productos', String(producto.id));
    await setDoc(productosRef, { ...producto, persistedAt: serverTimestamp() });
    return { id: producto.id };
  } catch (err) {
    console.error('saveProducto error', err);
    throw err;
  }
}

export async function deleteProducto(productoId) {
  try {
    if (!productoId) throw new Error('productoId required');
    const productoRef = doc(db, 'productos', String(productoId));
    await deleteDoc(productoRef);
    return { id: productoId };
  } catch (err) {
    console.error('deleteProducto error', err);
    throw err;
  }
}

export async function fetchProductos() {
  try {
    const q = collection(db, 'productos');
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ ...d.data(), id: isNaN(Number(d.id)) ? d.id : Number(d.id) }));
    return items;
  } catch (err) {
    console.error('fetchProductos error', err);
    throw err;
  }
}

export async function fetchVentas() {
  try {
    const q = collection(db, 'ventas');
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ ...d.data(), id: isNaN(Number(d.id)) ? d.id : Number(d.id) }));
    return items;
  } catch (err) {
    console.error('fetchVentas error', err);
    throw err;
  }
}

export default db;

// Stock (tanque) helpers — single document 'main' in collection 'stock'
export async function fetchStock() {
  try {
    const ref = doc(db, 'stock', 'main');
    const snap = await getDoc(ref);
    if (!snap.exists()) return { liters: 5000 };
    return snap.data();
  } catch (err) {
    console.error('fetchStock error', err);
    throw err;
  }
}

export async function saveStock(payload) {
  try {
    const ref = doc(db, 'stock', 'main');
    await setDoc(ref, { ...payload, persistedAt: serverTimestamp() }, { merge: true });
    return payload;
  } catch (err) {
    console.error('saveStock error', err);
    throw err;
  }
}

// Gastos (Expenses) helpers
export async function saveGasto(gasto) {
  try {
    if (!gasto || !gasto.id) throw new Error('gasto must have id');
    const gastosRef = doc(db, 'gastos', String(gasto.id));
    await setDoc(gastosRef, { ...gasto, persistedAt: serverTimestamp() });
    return { id: gasto.id };
  } catch (err) {
    console.error('saveGasto error', err);
    throw err;
  }
}

export async function deleteGasto(gastoId) {
  try {
    if (!gastoId) throw new Error('gastoId required');
    const gastoRef = doc(db, 'gastos', String(gastoId));
    await deleteDoc(gastoRef);
    return { id: gastoId };
  } catch (err) {
    console.error('deleteGasto error', err);
    throw err;
  }
}

export async function fetchGastos() {
  try {
    const q = collection(db, 'gastos');
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ ...d.data(), id: isNaN(Number(d.id)) ? d.id : Number(d.id) }));
    return items;
  } catch (err) {
    console.error('fetchGastos error', err);
    throw err;
  }
}
