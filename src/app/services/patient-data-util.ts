// src/app/services/patient-data-util.ts
import { Injectable } from '@angular/core';

// ✅ INTERFAZ ACTUALIZADA con las 6 variables del modelo 2026
export interface PatientClinicalData {
  imc: number | null;
  edad: number | null;
  genero: string | null;
  peso_kg: number | null;
  talla_cm: number | null;
  tiene_diabetes: number;
  
  // Campos opcionales para compatibilidad
  fechaNacimiento?: string | null;
  sexo?: string | null;
}

// ✅ INTERFAZ ACTUALIZADA para el payload de inferencia
export interface PayloadInferenciaIA {
  edad: number;
  genero: 'M' | 'F';
  peso_kg: number;
  talla_cm: number;
  imc: number;
  tiene_diabetes: number;
}

@Injectable({
  providedIn: 'root'
})
export class PatientDataUtilService {

  constructor() {}

  /**
   * 🔢 Calcular edad a partir de fechaNacimiento (YYYY-MM-DD)
   */
  calcularEdad(fechaNacimiento: string | null): number | null {
    if (!fechaNacimiento) return null;
    
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    
    if (isNaN(nacimiento.getTime())) return null;
    
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mesDiff = hoy.getMonth() - nacimiento.getMonth();
    
    if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    return edad >= 0 && edad <= 120 ? edad : null;
  }

  /**
   * 🔄 Mapear sexo del formulario a formato de API ('M' | 'F')
   */
  mapearGenero(sexo: string | null): 'M' | 'F' | null {
    if (!sexo) return null;
    
    const valor = sexo.toLowerCase().trim();
    
    if (['masculino', 'm', 'hombre', 'male', 'varón', 'varon'].includes(valor)) {
      return 'M';
    }
    if (['femenino', 'f', 'mujer', 'female'].includes(valor)) {
      return 'F';
    }
    
    return null;
  }

  /**
   * 📦 Preparar payload para FastAPI con las 6 variables del modelo 2026
   * @param datos Datos clínicos del paciente
   * @returns Payload listo para enviar a la API de inferencia
   */
  prepararPayloadInferencia(datos: PatientClinicalData): PayloadInferenciaIA {
    // Validar IMC
    if (datos.imc === null || isNaN(datos.imc) || datos.imc <= 0) {
      throw new Error('El IMC es requerido y debe ser un valor válido para la inferencia');
    }

    // Determinar edad
    let edadFinal: number | null = datos.edad;
    
    if (!edadFinal && datos.fechaNacimiento) {
      edadFinal = this.calcularEdad(datos.fechaNacimiento);
    }
    
    if (!edadFinal) {
      throw new Error('La edad es requerida para la inferencia');
    }

    // Determinar género
    const genero = this.mapearGenero(datos.genero || datos.sexo || null);
    if (!genero) {
      throw new Error('El género es requerido para la inferencia');
    }

    // Calcular peso y talla si faltan (usando IMC)
    let pesoFinal = datos.peso_kg;
    let tallaFinal = datos.talla_cm;
    
    if (!pesoFinal && tallaFinal && datos.imc) {
      const tallaM = tallaFinal / 100;
      pesoFinal = parseFloat((datos.imc * tallaM * tallaM).toFixed(2));
      console.log(`⚠️ Peso calculado desde IMC: ${pesoFinal} kg`);
    }
    
    if (!tallaFinal && pesoFinal && datos.imc) {
      const tallaM = Math.sqrt(pesoFinal / datos.imc);
      tallaFinal = parseFloat((tallaM * 100).toFixed(2));
      console.log(`⚠️ Talla calculada desde IMC: ${tallaFinal} cm`);
    }
    
    // Valores por defecto si aún faltan
    if (!pesoFinal) {
      pesoFinal = genero === 'M' ? 75 : 65;
      console.log(`⚠️ Peso asumido por defecto: ${pesoFinal} kg`);
    }
    
    if (!tallaFinal) {
      tallaFinal = genero === 'M' ? 170 : 160;
      console.log(`⚠️ Talla asumida por defecto: ${tallaFinal} cm`);
    }

    // Tiene diabetes (por defecto 0)
    const tieneDiabetes = datos.tiene_diabetes !== undefined ? datos.tiene_diabetes : 0;

    const payload: PayloadInferenciaIA = {
      edad: edadFinal,
      genero: genero,
      peso_kg: parseFloat(pesoFinal.toFixed(2)),
      talla_cm: parseFloat(tallaFinal.toFixed(2)),
      imc: parseFloat(datos.imc.toFixed(2)),
      tiene_diabetes: tieneDiabetes
    };

    console.log('📦 [PatientDataUtil] Payload preparado:', payload);
    return payload;
  }

  /**
   * ✅ Validar que los datos están completos para inferencia
   */
  validarDatosParaInferencia(datos: PatientClinicalData): {
    valido: boolean;
    errores: string[];
    advertencias: string[];
  } {
    const errores: string[] = [];
    const advertencias: string[] = [];

    // IMC es obligatorio
    if (datos.imc === null || isNaN(datos.imc)) {
      errores.push('El IMC es requerido');
    } else if (datos.imc < 10 || datos.imc > 80) {
      errores.push('El IMC está fuera del rango válido (10-80)');
    }

    // Edad es obligatoria (o fechaNacimiento para calcularla)
    if (!datos.edad && !datos.fechaNacimiento) {
      errores.push('La edad o fecha de nacimiento es requerida');
    } else if (datos.edad && (datos.edad < 18 || datos.edad > 120)) {
      errores.push('La edad debe estar entre 18 y 120 años');
    }

    // Género es obligatorio
    if (!datos.genero && !datos.sexo) {
      errores.push('El género es requerido');
    }

    // Advertencias para datos opcionales
    if (!datos.peso_kg && !datos.talla_cm) {
      advertencias.push('Peso y talla no disponibles. Se calcularán desde el IMC.');
    }

    if (datos.tiene_diabetes === undefined || datos.tiene_diabetes === null) {
      advertencias.push('Estado de diabetes no especificado. Se asumirá: No diabético.');
    }

    return {
      valido: errores.length === 0,
      errores,
      advertencias
    };
  }
}