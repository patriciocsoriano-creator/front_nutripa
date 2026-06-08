// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,  // 
  apiUrl: 'http://localhost:3000',           // Tu backend Node.js
  aiApiUrl: 'http://127.0.0.1:8001', 



  fatsecret: {
    consumer_key: 'd4151a9da81d4a61bda12909e8c8c944',        // ← Pega tu Consumer Key aquí
    consumer_secret: '5053b6fe9f3743189507c1dc36258daa',     // ← Pega tu Consumer Secret aquí (en producción usa backend proxy)
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
