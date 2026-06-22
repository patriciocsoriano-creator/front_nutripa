import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { catchError, tap } from 'rxjs/operators';
import { throwError, Observable, of, pipe } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class GeneralService {
  
  private apiUrl: string;

  constructor(private http: HttpClient) {
    // Ahora el fallback es Node.js
   this.apiUrl = environment.apiUrl || 'http://api.72.61.11.127.nip.io';

   console.log(' [API] URL configurada:', this.apiUrl);
  }

  login(email: string, password: string) {
  return this.http.post(`${this.apiUrl}/nutricionapp-api/login`, { email, password })
    .pipe(
      tap(response => console.log(' Login exitoso:', response)),
      catchError(error => {
        console.error('Error en login:', error);
        return throwError(() => new Error(error.error?.mensaje || 'Error en el servicio de autenticación'));
      })
    );
}

registrarUsuario(datos: any) {
  return this.http.post(`${this.apiUrl}/nutricionapp-api/registro`, datos)
    .pipe(
      tap(response => console.log(' Respuesta registro:', response)), // 👈 Para debug
      catchError(error => {
        console.error(' Error completo en registro:', error);
        
        //  Extraer mensaje real del backend
        const mensajeError = error?.error?.mensaje 
          || error?.error?.message 
          || error?.message 
          || 'Error en el servicio de registro';
          
        return throwError(() => new Error(mensajeError));
      })
    );
}

//  Buscar paciente existente por cédula o nombre
buscarPaciente(params: { cedula?: string; nombre?: string; apellido?: string }): Observable<any> {
    let queryString = '';
    if (params.cedula) {
      queryString = `?cedula=${params.cedula}`;
    } else if (params.nombre && params.apellido) {
      queryString = `?nombre=${encodeURIComponent(params.nombre)}&apellido=${encodeURIComponent(params.apellido)}`;
    }
    
    return this.http.get(`${this.apiUrl}/nutricionapp-api/registro/buscar-paciente${queryString}`)
      .pipe(
        catchError(error => {
          console.error(' Error buscando paciente:', error);
          return throwError(() => new Error('Error al buscar paciente'));
        })
      );
  }
}