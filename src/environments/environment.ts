// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  
  // 🌐 URL del Backend Node.js (API principal)
  apiUrl: 'http://api.72.61.11.127.nip.io/nutricionapp-api',

  // 🍎 Configuración de FatSecret API
  // ⚠️ En desarrollo se pueden usar, pero en producción el backend debe hacer el proxy
  fatsecret: {
    consumer_key: 'd4151a9da81d4a61bda12909e8c8c944',
    consumer_secret: '5053b6fe9f3743189507c1dc36258daa',
    api_base: 'https://platform.fatsecret.com/rest/server.api'
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.