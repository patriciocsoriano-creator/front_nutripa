// src/app/services/fatsecret-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { FoodItem } from '../models/nutrition-plan.model';

export interface FatSecretSearchResponse {
  error: boolean;
  query: string;
  total: number;
  alimentos: FoodItem[];
}

@Injectable({ providedIn: 'root' })
export class FatsecretApiService {

  // ✅ URL del PROXY en tu backend Node.js (NO FatSecret directo)
  private readonly API_URL = `${environment.apiUrl}/nutricionapp-api/fatsecret`;

  constructor(private http: HttpClient) {}

  /**
   * 🔍 Buscar alimentos vía proxy del backend
   * El backend se encarga de OAuth 1.0a con FatSecret
   */
  searchFoods(query: string, maxResults: number = 10): Observable<FoodItem[]> {
    const token = localStorage.getItem('token');
    
    return this.http.post<FatSecretSearchResponse>(
      `${this.API_URL}/search`,
      { query, max_results: maxResults },
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        })
      }
    ).pipe(
      timeout(10000),
      map(response => {
        if (response.error) {
          console.warn('⚠️ FatSecret proxy error:', response);
          return [];
        }
        console.log(`✅ FatSecret: ${response.total} alimentos encontrados para "${query}"`);
        return response.alimentos;
      }),
      catchError(error => {
        console.error(`❌ FatSecret proxy error para "${query}":`, error);
        return of([]); // Fallback controlado
      })
    );
  }

  /**
   * 🔍 Obtener detalles de un alimento por ID (vía proxy)
   */
  getFoodDetails(foodId: string): Observable<any> {
    const token = localStorage.getItem('token');
    
    return this.http.post(
      `${this.API_URL}/food/${foodId}`,
      {},
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        })
      }
    ).pipe(
      timeout(8000),
      catchError(() => of(null))
    );
  }

  /**
   * 🔐 Verificar configuración del proxy
   */
  checkProxyHealth(): Observable<any> {
    return this.http.get(`${this.API_URL}/health`).pipe(
      catchError(() => of({ status: 'error', message: 'Proxy no disponible' }))
    );
  }
}