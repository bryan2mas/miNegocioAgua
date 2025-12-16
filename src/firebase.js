// Thin re-export to the clean firebase client implementation.
// This preserves existing imports that use `./firebase` while the
// implementation lives in `./firebaseClient.js`.

export * from './firebaseClient';
export { default } from './firebaseClient';
