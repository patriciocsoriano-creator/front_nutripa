export const environment = {
  production: true,
  
  // 🌐 URL del Backend Node.js en producción
  // ⚠️ CAMBIA ESTA URL POR TU DOMINIO REAL DE PRODUCCIÓN
  //apiUrl: 'https://tu-dominio.com',  // Ejemplo: 'https://api.nutripa.com'
  //apiUrl: 'http://localhost:3000',
  apiUrl: 'https://nutriappapi.serverteced.cloud/',
  
  // 🍎 Configuración de FatSecret API
  // ⚠️ En producción, estas credenciales deberían venir del backend
  // Esto es solo un fallback, el backend debe hacer el proxy
  fatsecret: {
    consumer_key: '',  // ⚠️ VACÍO en producción - el backend maneja esto
    consumer_secret: '',  // ⚠️ VACÍO en producción - el backend maneja esto
    api_base: 'https://platform.fatsecret.com/rest/server.api'
  }
};