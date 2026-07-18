// src/app/services/registro-paciente.ts
import { Injectable } from '@angular/core';

//  Interfaces para tipado seguro
export interface PersonalData {
  nombres?: string;
  apellidos?: string;
  numeroIdentificacion?: string;
  fechaNacimiento?: string;
  sexo?: string;
  direccion?: string;
  telefono?: string;
  ocupacion?: string;
  actividadFisica?: string;
  [key: string]: any; // Permite propiedades adicionales
}

export interface VitalSignsData {
  frecuenciaCardiaca?: number | null;
  presionArterial?: string;
  frecuenciaRespiratoria?: number | null;
  temperatura?: number | null;
  spo2?: number | null;
  glucosaAyunas?: number | null;
  glucosaPostprandial?: number | null;
  hemoglobinaGlicosilada?: number | null;
  [key: string]: any;
}

export interface AnthropometricData {
  peso?: number | null;
  talla?: number | null;
  imc?: number | null;
  circunferenciaCintura?: number | null;
  [key: string]: any;
}

export interface MetabolicData {
  hipertension?: boolean;
  obesidad?: boolean;
  dislipidemia?: boolean;
  higadoGraso?: boolean;
  resistenciaInsulina?: boolean;
  [key: string]: any;
}

export interface PatientDataContainer {
  informacionPersonal: PersonalData;
  signosVitales: VitalSignsData;
  antropometria: AnthropometricData;
  enfermedadesMetabolicas: MetabolicData;
}

@Injectable({
  providedIn: 'root'
})
export class PatientRegistrationService {
  
  //  Almacenamiento en memoria con tipado explícito
  private patientData: PatientDataContainer = {
    informacionPersonal: {},
    signosVitales: {},
    antropometria: {},
    enfermedadesMetabolicas: {}
  };

  constructor() { }

  // ============================================
  //  SETTERS: Guardar datos de cada paso
  // ============================================

  setPersonalData(data: Partial<PersonalData>): void {
    this.patientData.informacionPersonal = { 
      ...this.patientData.informacionPersonal, 
      ...data 
    };
  }

  setVitalSignsData(data: Partial<VitalSignsData>): void {
    this.patientData.signosVitales = { 
      ...this.patientData.signosVitales, 
      ...data 
    };
  }

  setAnthropometricData(data: Partial<AnthropometricData>): void {
    this.patientData.antropometria = { 
      ...this.patientData.antropometria, 
      ...data 
    };
    // Calcular IMC automáticamente si hay peso y talla
    if (data.peso && data.talla && data.talla > 0) {
      this.patientData.antropometria.imc = parseFloat((data.peso / (data.talla * data.talla)).toFixed(2));
    }
  }

  setMetabolicData(data: Partial<MetabolicData>): void {
    this.patientData.enfermedadesMetabolicas = { 
      ...this.patientData.enfermedadesMetabolicas, 
      ...data 
    };
  }

  // ============================================
  //  GETTERS: Recuperar datos de cada paso
  // ============================================

  getPersonalData(): PersonalData | null {
    return Object.keys(this.patientData.informacionPersonal).length > 0 
      ? { ...this.patientData.informacionPersonal } 
      : null;
  }

  getVitalSignsData(): VitalSignsData | null {
    return Object.keys(this.patientData.signosVitales).length > 0 
      ? { ...this.patientData.signosVitales } 
      : null;
  }

  getAnthropometricData(): AnthropometricData | null {
    return Object.keys(this.patientData.antropometria).length > 0 
      ? { ...this.patientData.antropometria } 
      : null;
  }

  getMetabolicData(): MetabolicData | null {
    return Object.keys(this.patientData.enfermedadesMetabolicas).length > 0 
      ? { ...this.patientData.enfermedadesMetabolicas } 
      : null;
  }

  // ============================================
  //  Obtener todos los datos acumulados
  // ============================================

  getPatientData(): PatientDataContainer & { fechaRegistro: string; imcCalculado: number | null } {
    return { 
      ...this.patientData,
      fechaRegistro: new Date().toISOString(),
      imcCalculado: this.patientData.antropometria?.imc || null
    };
  }

  // ============================================
  //  Limpiar datos después de guardar
  // ============================================

  clearData(): void {
    this.patientData = {
      informacionPersonal: {},
      signosVitales: {},
      antropometria: {},
      enfermedadesMetabolicas: {}
    };
  }

  // ============================================
  //  Validar que un paso esté completo antes de avanzar
  // ============================================

  isStepValid(step: string): boolean {
    switch(step) {
      case 'personal':
        return !!this.patientData.informacionPersonal.nombres && 
               !!this.patientData.informacionPersonal.numeroIdentificacion;
      case 'signosVitales':
        return !!this.patientData.signosVitales.frecuenciaCardiaca && 
               !!this.patientData.signosVitales.presionArterial;
      case 'antropometria':
        return !!this.patientData.antropometria.peso && 
               !!this.patientData.antropometria.talla;
      case 'metabolicas':
        return true; // Este paso puede ser opcional
      default:
        return true;
    }
  }

  // ============================================
  //  Utilidades adicionales (CORREGIDAS CON TIPOS)
  // ============================================

  //  Verificar si hay datos guardados en cualquier sección (TS2769 SOLUCIONADO)
  hasAnyData(): boolean {
    // Tipado explícito para evitar error TS2769
    const sections: Record<string, object>[] = [
      this.patientData.informacionPersonal,
      this.patientData.signosVitales,
      this.patientData.antropometria,
      this.patientData.enfermedadesMetabolicas
    ];
    
    return sections.some(section => Object.keys(section).length > 0);
  }

  //  Obtener resumen del progreso del registro
  getProgress(): { step: string; completed: boolean }[] {
    return [
      { step: 'personal', completed: this.isStepValid('personal') },
      { step: 'signosVitales', completed: this.isStepValid('signosVitales') },
      { step: 'antropometria', completed: this.isStepValid('antropometria') },
      { step: 'metabolicas', completed: true }
    ];
  }
}