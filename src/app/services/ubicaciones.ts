import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, tap, shareReplay, map } from 'rxjs/operators';

export interface Parroquia {
  codigo: string;
  nombre: string;
}

export interface Canton {
  codigo: string;
  nombre: string;
  parroquias: Parroquia[];
}

export interface Provincia {
  codigo: string;
  nombre: string;
  cantones: Canton[];
}

@Injectable({
  providedIn: 'root'
})
export class LocationsService {

  
// ✅ URL correcta (sin .git, con /raw/)
  private readonly DATA_URL = 'https://gist.githubusercontent.com/emamut/6626d3dff58598b624a1/raw';  private locationsData: any = null;
  private dataLoaded$ = new BehaviorSubject<boolean>(false);
  private provincesList: Provincia[] = [];

  constructor(private http: HttpClient) { }

  /**
   * Carga los datos de ubicaciones desde el gist
   */
  loadLocations(): Observable<boolean> {
    // Si ya está cargado, retornar inmediatamente
    if (this.locationsData && this.provincesList.length > 0) {
      return of(true);
    }

    return this.http.get<any>(this.DATA_URL).pipe(
      tap(data => {
        this.locationsData = data;
        this.provincesList = this.parseProvincesSafe(data);
        this.dataLoaded$.next(true);
        console.log('✅ Ubicaciones de Ecuador cargadas:', this.provincesList.length, 'provincias');
      }),
      catchError(error => {
        console.error('❌ Error cargando ubicaciones de Ecuador:', error);
        this.loadFallbackData();
        this.dataLoaded$.next(true);
        return of(false);
      }),
      shareReplay(1)
    );
  }

  /**
   * Parseo SEGURO que maneja estructuras variables del JSON
   */
  private parseProvincesSafe(data: any): Provincia[] {
    if (!data || typeof data !== 'object') {
      console.warn('⚠️ Datos de ubicaciones inválidos');
      return [];
    }

    const provinces: Provincia[] = [];

    // Iterar sobre cada entrada del JSON
    Object.entries(data).forEach(([codigo, info]: [string, any]) => {
      // Validar que tenga el campo 'provincia' o 'nombre'
      const nombreProvincia = info?.provincia || info?.nombre || info?.Provincia;
      
      if (!nombreProvincia || typeof nombreProvincia !== 'string') {
        console.warn(`⚠️ Provincia con código "${codigo}" no tiene nombre válido, saltando...`);
        return;
      }

      provinces.push({
        codigo: codigo.toString(),
        nombre: nombreProvincia.trim().toUpperCase(),
        cantones: [] // Se llenan bajo demanda
      });
    });

    // ✅ Sort SEGURO: validar que ambos nombres existan antes de comparar
    return provinces.sort((a, b) => {
      if (!a?.nombre || !b?.nombre) return 0;
      return a.nombre.localeCompare(b.nombre, 'es-ES');
    });
  }

  /**
   * Obtiene lista de provincias para el select
   */
  getProvincias(): Provincia[] {
    return this.provincesList;
  }

  /**
   * Obtiene cantones de una provincia específica
   */
  getCantonesByProvincia(provinciaCodigo: string): Canton[] {
    if (!this.locationsData?.[provinciaCodigo]) return [];
    
    const cantonesRaw = this.locationsData[provinciaCodigo].cantones;
    if (!cantonesRaw) return [];

    return Object.entries(cantonesRaw)
      .map(([codigo, data]: [string, any]) => {
        // Validar estructura del cantón
        const nombreCanton = data?.canton || data?.nombre || data?.Canton;
        if (!nombreCanton) return null;

        const parroquiasRaw = data.parroquias || {};
        const parroquias: Parroquia[] = Object.entries(parroquiasRaw)
          .map(([pCode, pName]: [string, any]) => {
            // Las parroquias pueden ser string directo o objeto
            const nombreParroquia = typeof pName === 'string' 
              ? pName 
              : pName?.parroquia || pName?.nombre || pName?.Parroquia;
            
            if (!nombreParroquia) return null;
            
            return {
              codigo: pCode.toString(),
              nombre: nombreParroquia.toString().trim()
            };
          })
          .filter((p): p is Parroquia => p !== null);

        return {
          codigo: codigo.toString(),
          nombre: nombreCanton.toString().trim(),
          parroquias
        };
      })
      .filter((c): c is Canton => c !== null)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-ES'));
  }

  /**
   * Obtiene parroquias de un cantón específico
   */
  getParroquiasByCanton(provinciaCodigo: string, cantonCodigo: string): Parroquia[] {
    if (!this.locationsData?.[provinciaCodigo]?.cantones?.[cantonCodigo]) return [];
    
    const parroquiasRaw = this.locationsData[provinciaCodigo].cantones[cantonCodigo].parroquias;
    if (!parroquiasRaw) return [];

    return Object.entries(parroquiasRaw)
      .map(([codigo, nombre]: [string, any]) => {
        const nombreParroquia = typeof nombre === 'string' 
          ? nombre 
          : nombre?.parroquia || nombre?.nombre || nombre?.Parroquia;
        
        if (!nombreParroquia) return null;
        
        return {
          codigo: codigo.toString(),
          nombre: nombreParroquia.toString().trim()
        };
      })
      .filter((p): p is Parroquia => p !== null)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-ES'));
  }

  /**
   * Observable para saber si los datos ya cargaron
   */
  onDataLoaded(): Observable<boolean> {
    return this.dataLoaded$.asObservable();
  }

  /**
   * Datos de respaldo completos (24 provincias) por si falla la carga
   */
  private loadFallbackData(): void {
    this.locationsData = {
      "1": { provincia: "AZUAY", cantones: {} },
      "2": { provincia: "BOLÍVAR", cantones: {} },
      "3": { provincia: "CAÑAR", cantones: {} },
      "4": { provincia: "CARCHI", cantones: {} },
      "5": { provincia: "COTOPAXI", cantones: {} },
      "6": { provincia: "CHIMBORAZO", cantones: {} },
      "7": { provincia: "EL ORO", cantones: {} },
      "8": { provincia: "ESMERALDAS", cantones: {} },
      "9": { provincia: "GUAYAS", cantones: {} },
      "10": { provincia: "IMBABURA", cantones: {} },
      "11": { provincia: "LOJA", cantones: {} },
      "12": { provincia: "LOS RÍOS", cantones: {} },
      "13": { provincia: "MANABÍ", cantones: {} },
      "14": { provincia: "MORONA SANTIAGO", cantones: {} },
      "15": { provincia: "NAPO", cantones: {} },
      "16": { provincia: "PASTAZA", cantones: {} },
      "17": { provincia: "PICHINCHA", cantones: {} },
      "18": { provincia: "TUNGURAHUA", cantones: {} },
      "19": { provincia: "ZAMORA CHINCHIPE", cantones: {} },
      "20": { provincia: "GALÁPAGOS", cantones: {} },
      "21": { provincia: "SUCUMBÍOS", cantones: {} },
      "22": { provincia: "ORELLANA", cantones: {} },
      "23": { provincia: "SANTO DOMINGO DE LOS TSÁCHILAS", cantones: {} },
      "24": { provincia: "SANTA ELENA", cantones: {} }
    };
    this.provincesList = this.parseProvincesSafe(this.locationsData);
    console.warn('⚠️ Usando datos de respaldo para ubicaciones de Ecuador');
  }

  /**
   * Método utilitario para depuración
   */
  debugData(): void {
    console.log('📊 LocationsService Debug:', {
      loaded: !!this.locationsData,
      provincesCount: this.provincesList.length,
      firstProvince: this.provincesList[0],
      dataKeys: this.locationsData ? Object.keys(this.locationsData).slice(0, 5) : []
    });
  }
}