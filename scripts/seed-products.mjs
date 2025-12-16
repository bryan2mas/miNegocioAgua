import { fetchProductos, saveProducto } from '../src/firebaseClient.js';

const PRODUCTOS_INICIALES = [
  { id: 1, nombre: 'Botellon 20L', precio: 100, icono: 'big', consumoLitros: 20 },
  { id: 2, nombre: 'Botellon 18L', precio: 100, icono: 'big', consumoLitros: 18 },
  { id: 3, nombre: 'Botellon 15L', precio: 80, icono: 'medium', consumoLitros: 15 },
  { id: 4, nombre: 'Botellon 12L', precio: 60, icono: 'small', consumoLitros: 12 },
  { id: 5, nombre: 'Botellon 8L', precio: 30, icono: 'small', consumoLitros: 8 },
  { id: 6, nombre: 'Botella 5L', precio: 30, icono: 'small', consumoLitros: 5 },
  { id: 7, nombre: 'Tapa Generica', precio: 10, icono: 'accessory', consumoLitros: 0 },
];

(async function main(){
  try{
    console.log('Checking Firestore for productos...');
    const items = await fetchProductos();
    if (!items || items.length === 0) {
      console.log('No productos found — seeding initial products...');
      for (const p of PRODUCTOS_INICIALES) {
        try{
          await saveProducto(p);
          console.log(`Seeded producto id=${p.id} - ${p.nombre}`);
        }catch(err){
          console.error('Failed saving producto', p, err);
        }
      }
      console.log('Seeding completed.');
    } else {
      console.log(`Found ${items.length} productos in Firestore. No action taken.`);
    }
  }catch(err){
    console.error('Error checking/ seeding productos:', err);
    process.exit(1);
  }
})();
