// src/app/services/patient-data-util
import { Injectable } from '@angular/core';

export interface PatientClinicalData {
  imc: number | null;
  fechaNacimiento: string | null;
  edad?: number | null;  // ✅ NUEVO: edad ya calculada por el backend
  sexo: string | null;
}

export interface PayloadInferenciaIA {
  imc: number;
  edad: number | null;
  genero: 'M' | 'F' | null;
}

@Injectable({
  providedIn: 'root'
})
export class PatientDataUtilService {

  constructor() {}

  /**
   * 🔢 Calcular edad a partir de fechaNacimiento (YYYY-MM-DD)
   * @param fechaNacimiento Fecha en formato 'YYYY-MM-DD'
   * @returns Edad en años o null si no se puede calcular
   */
  calcularEdad(fechaNacimiento: string | null): number | null {
  console.log('🔍 [calcularEdad] Input:', { fechaNacimiento, tipo: typeof fechaNacimiento });
  
  if (!fechaNacimiento) {
    console.warn('⚠️ [calcularEdad] fechaNacimiento es null o vacío');
    return null;
  }
  
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  
  console.log('🔍 [calcularEdad] Fecha parseada:', { nacimiento, isValid: !isNaN(nacimiento.getTime()) });
  
  if (isNaN(nacimiento.getTime())) {
    console.warn('⚠️ [calcularEdad] Fecha inválida:', fechaNacimiento);
    return null;
  }
  
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mesDiff = hoy.getMonth() - nacimiento.getMonth();
  
  if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  
  console.log('✅ [calcularEdad] Edad calculada:', edad);
  return edad >= 0 && edad <= 120 ? edad : null;
}

  /**
   * 🔄 Mapear sexo del formulario a formato de API ('M' | 'F')
   * @param sexo Valor del formulario (ej: 'Masculino', 'F', 'female')
   * @returns 'M', 'F' o null si no se puede mapear
   */
  mapearGenero(sexo: string | null): 'M' | 'F' | null {
    if (!sexo) return null;
    
    const valor = sexo.toLowerCase().trim();
    
    // Mapeo flexible para aceptar diferentes formatos
    if (['masculino', 'm', 'hombre', 'male', 'varón', 'varon'].includes(valor)) {
      return 'M';
    }
    if (['femenino', 'f', 'mujer', 'female'].includes(valor)) {
      return 'F';
    }
    
    return null;
  }

  /**
   * 📦 Preparar payload para FastAPI desde datos clínicos del paciente
   * @param datos Datos clínicos del paciente
   * @returns Payload listo para enviar a la API de inferencia
   * @throws Error si el IMC es null o inválido
   */
  prepararPayloadInferencia(datos: PatientClinicalData): PayloadInferenciaIA {
  if (datos.imc === null || isNaN(datos.imc) || datos.imc <= 0) {
    throw new Error('El IMC es requerido y debe ser un valor válido para la inferencia');
  }

  // ✅ PRIORIDAD: Usar edad directa si está disponible, sino calcular desde fechaNacimiento
  let edadFinal: number | null = null;
  
  if (datos.edad !== undefined && datos.edad !== null) {
    // Backend ya calculó la edad, usarla directamente
    edadFinal = datos.edad;
    console.log('✅ [Payload] Usando edad directa del backend:', edadFinal);
  } else if (datos.fechaNacimiento) {
    // Fallback: calcular edad desde fechaNacimiento
    edadFinal = this.calcularEdad(datos.fechaNacimiento);
    console.log('🔄 [Payload] Calculando edad desde fechaNacimiento:', edadFinal);
  }

  return {
    imc: Number(datos.imc.toFixed(2)),
    edad: edadFinal,  // ✅ Ahora puede ser directa o calculada
    genero: this.mapearGenero(datos.sexo)
  };
}

  /**
   * ✅ Validar que los datos están completos para inferencia
   * @param datos Datos a validar
   * @returns Objeto con estado de validación y mensajes de error
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
    } else if (datos.imc < 10 || datos.imc > 60) {
      errores.push('El IMC está fuera del rango válido (10-60)');
    }

    // Edad y género son opcionales pero recomendados
    if (!datos.fechaNacimiento) {
      advertencias.push('La fecha de nacimiento no está disponible. La inferencia será menos precisa.');
    }
    if (!datos.sexo) {
      advertencias.push('El género no está disponible. La inferencia será menos precisa.');
    }

    return {
      valido: errores.length === 0,
      errores,
      advertencias
    };
  }
}