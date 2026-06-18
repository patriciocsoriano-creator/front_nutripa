// src/app/services/ml-service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { PatientDataUtilService, PatientClinicalData, PayloadInferenciaIA } from './patient-data-util';

// ✅ Interfaz de respuesta de la API
export interface PrediccionResponse {
  perfil_id: number;
  perfil_nombre: string;
  confianza: number;
  probabilidades: Record<string, number>;
  explicacion: string;
  recomendacion: string;
  incertidumbre: string;
}

@Injectable({
  providedIn: 'root'
})
export class MlService {

  private readonly ML_API_URL = `${environment.apiUrl}/nutricionapp-api/api/ml`;

  constructor(
    private http: HttpClient,
    private dataUtil: PatientDataUtilService
  ) {}

  /**
   * 🚀 Inferir perfil dietético desde datos clínicos del paciente
   */
  inferirPerfilDesdeDatosClinicos(datosClinicos: PatientClinicalData): Observable<PrediccionResponse> {
    console.log('📥 [MlService] Datos clínicos recibidos:', datosClinicos);
    
    const validacion = this.dataUtil.validarDatosParaInferencia(datosClinicos);
    
    if (!validacion.valido) {
      console.error('❌ [MlService] Validación fallida:', validacion.errores);
      return throwError(() => new Error(
        `Datos inválidos para inferencia: ${validacion.errores.join(', ')}`
      ));
    }

    if (validacion.advertencias.length > 0) {
      console.warn('⚠️ [MlService] Advertencias:', validacion.advertencias);
    }

    const payload = this.dataUtil.prepararPayloadInferencia(datosClinicos);
    console.log('📤 [MlService] Payload final enviado al proxy:', payload);

    return this.predecirPerfil(payload);
  }

  /**
   * 🚀 Llamar al endpoint de inferencia a través del proxy del backend
   */
  private predecirPerfil(payload: PayloadInferenciaIA): Observable<PrediccionResponse> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    console.log('🚀 [MlService] Enviando petición a:', `${this.ML_API_URL}/prediccion-perfil`);

    return this.http.post<PrediccionResponse>(
      `${this.ML_API_URL}/prediccion-perfil`,
      payload,
      { headers }
    ).pipe(
      map(response => {
        console.log('✅ [MlService] Perfil obtenido:', response.perfil_nombre);
        return response;
      }),
      catchError(error => {
        console.error('❌ [MlService] Error en inferencia:', error);
        
        let mensajeError = 'No se pudo obtener el perfil dietético.';
        
        if (error.status === 503) {
          mensajeError = 'El servicio de IA no está disponible. Verifica que el servicio Python esté corriendo.';
        } else if (error.status === 401) {
          mensajeError = 'No autorizado. Por favor inicia sesión nuevamente.';
        } else if (error.status === 400) {
          mensajeError = `Datos inválidos: ${error.error?.mensaje || error.error?.detail || 'Verifica los datos ingresados'}`;
        } else if (error.status === 0) {
          mensajeError = 'No se pudo conectar con el servidor. Verifica tu conexión.';
        }
        
        return throwError(() => new Error(mensajeError));
      })
    );
  }

  /**
   * 🔍 Verificar estado del servicio de IA
   */
  verificarSaludML(): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get(`${this.ML_API_URL}/health`, { headers }).pipe(
      catchError(error => {
        console.warn('⚠️ Servicio de IA no disponible:', error);
        return throwError(() => new Error(
          'El servicio de inteligencia artificial no está disponible.'
        ));
      })
    );
  }

  public get dataUtilService(): PatientDataUtilService {
    return this.dataUtil;
  }
}