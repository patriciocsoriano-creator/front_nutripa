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

  // ✅ URL del proxy del backend Node.js (NO directamente a FastAPI)
  // El backend reenvía las peticiones al servicio ML Python
  private readonly ML_API_URL = `${environment.apiUrl}/nutricionapp-api/api/ml`;

  constructor(
    private http: HttpClient,
    private dataUtil: PatientDataUtilService
  ) {}

  /**
   * 🚀 Inferir perfil dietético desde datos clínicos del paciente
   * @param datosClinicos Datos completos del paciente
   * @returns Observable con la respuesta de la API
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

    const payload = this.dataUtil.prepararPayloadInferencia(datosClinicos);
    console.log('📤 [MlService] Payload final enviado al proxy:', payload);

    return this.predecirPerfil(payload);
  }

  /**
   * 🚀 Llamar al endpoint de inferencia a través del proxy del backend
   * @param payload Payload ya preparado
   * @returns Observable con la respuesta
   */
  private predecirPerfil(payload: PayloadInferenciaIA): Observable<PrediccionResponse> {
    // ✅ El proxy del backend REQUIERE token de autenticación
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    return this.http.post<PrediccionResponse>(
      `${this.ML_API_URL}/prediccion-perfil`,
      payload,
      { headers }
    ).pipe(
      map(response => {
        console.log('✅ Perfil obtenido:', response.perfil_nombre);
        return response;
      }),
      catchError(error => {
        console.error('❌ Error en inferencia:', error);
        
        let mensajeError = 'No se pudo obtener el perfil dietético.';
        
        if (error.status === 503) {
          mensajeError = 'El servicio de IA no está disponible. Verifica que el servicio Python esté corriendo en el puerto 8001.';
        } else if (error.status === 401) {
          mensajeError = 'No autorizado. Por favor inicia sesión nuevamente.';
        } else if (error.status === 0) {
          mensajeError = 'No se pudo conectar con el servidor. Verifica tu conexión.';
        }
        
        return throwError(() => new Error(mensajeError));
      })
    );
  }

  /**
   * 🔍 Verificar estado del servicio de IA a través del proxy
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

  // ✅ Exponer métodos del servicio de utilidades para uso directo si se necesita
  public get dataUtilService(): PatientDataUtilService {
    return this.dataUtil;
  }

  setVitalSignsData(data: any) {
    localStorage.setItem('vital_signs_data', JSON.stringify(data));
  }

  getVitalSignsData(): any | null {
    const data = localStorage.getItem('vital_signs_data');
    return data ? JSON.parse(data) : null;
  }
}