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

  // ✅ URL directa a tu API FastAPI
  private readonly AI_API_URL = environment.aiApiUrl || 'http://127.0.0.1:8001';

  constructor(
    private http: HttpClient,
    private dataUtil: PatientDataUtilService  // ✅ Inyectar servicio de utilidades
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
  console.log('📤 [MlService] Payload final enviado a FastAPI:', payload);

  return this.predecirPerfil(payload);
}

  /**
   * 🚀 Llamar al endpoint de inferencia de FastAPI (método interno)
   * @param payload Payload ya preparado
   * @returns Observable con la respuesta
   */
  private predecirPerfil(payload: PayloadInferenciaIA): Observable<PrediccionResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
      // ✅ FastAPI no requiere token para inferencia
    });

    return this.http.post<PrediccionResponse>(
      `${this.AI_API_URL}/prediccion-perfil`,
      payload,
      { headers }
    ).pipe(
      map(response => {
        console.log('✅ Perfil obtenido:', response.perfil_nombre);
        return response;
      }),
      catchError(error => {
        console.error('❌ Error en inferencia:', error);
        return throwError(() => new Error(
          'No se pudo obtener el perfil dietético. Verifica que el servicio de IA esté activo.'
        ));
      })
    );
  }

  /**
   * 🔍 Verificar estado del servicio de IA
   */
  verificarSaludML(): Observable<any> {
    return this.http.get(`${this.AI_API_URL}/health`).pipe(
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

  // 👇 AGREGAR ESTE MÉTODO GETTER (línea nueva)
  getVitalSignsData(): any | null {
    const data = localStorage.getItem('vital_signs_data');
    return data ? JSON.parse(data) : null;
  }
}