import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoadingController, ToastController, AlertController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { PatientRegistrationService } from 'src/app/services/registro-paciente';
import { Subject } from 'rxjs';

// ============================================
// CONFIGURACION DE RANGOS CLINICOS
// ============================================

export interface VitalSignRange {
  min: number;
  max: number;
  warningLow?: number;
  warningHigh?: number;
  criticalLow?: number;
  criticalHigh?: number;
  unit: string;
}

export interface PatientProfile {
  id: string;
  label: string;
  icon: string;
  ageRange?: { min: number; max: number };
  conditions?: string[];
  vitalRanges: {
    frecuenciaCardiaca: VitalSignRange;
    presionArterialSistolica: VitalSignRange;
    presionArterialDiastolica: VitalSignRange;
    frecuenciaRespiratoria: VitalSignRange;
    temperatura: VitalSignRange;
    spo2: VitalSignRange;
    glucosaAyunas: VitalSignRange;
    glucosaPostprandial: VitalSignRange;
    hemoglobinaGlicosilada: VitalSignRange;
  };
}

// Perfiles de pacientes con rangos clinicos
export const PATIENT_PROFILES: Record<string, PatientProfile> = {
  'adulto-sano': {
    id: 'adulto-sano',
    label: 'Adulto Sano (18-65 anos)',
    icon: 'person-outline',
    ageRange: { min: 18, max: 65 },
    vitalRanges: {
      frecuenciaCardiaca: { min: 60, max: 100, warningLow: 50, warningHigh: 110, criticalLow: 40, criticalHigh: 140, unit: 'lpm' },
      presionArterialSistolica: { min: 90, max: 120, warningLow: 90, warningHigh: 140, criticalLow: 80, criticalHigh: 180, unit: 'mmHg' },
      presionArterialDiastolica: { min: 60, max: 80, warningLow: 60, warningHigh: 90, criticalLow: 50, criticalHigh: 110, unit: 'mmHg' },
      frecuenciaRespiratoria: { min: 12, max: 20, warningLow: 10, warningHigh: 24, criticalLow: 8, criticalHigh: 30, unit: 'rpm' },
      temperatura: { min: 36.0, max: 37.5, warningLow: 35.0, warningHigh: 38.0, criticalLow: 34.0, criticalHigh: 40.0, unit: 'C' },
      spo2: { min: 95, max: 100, warningLow: 94, criticalLow: 90, criticalHigh: 100, unit: '%' },
      glucosaAyunas: { min: 70, max: 100, warningLow: 70, warningHigh: 125, criticalLow: 50, criticalHigh: 400, unit: 'mg/dL' },
      glucosaPostprandial: { min: 70, max: 140, warningHigh: 180, criticalHigh: 300, unit: 'mg/dL' },
      hemoglobinaGlicosilada: { min: 4.0, max: 5.6, warningHigh: 6.5, criticalHigh: 9.0, unit: '%' }
    }
  },
  
  'neonato': {
    id: 'neonato',
    label: 'Neonato (0-1 mes)',
    icon: 'baby-outline',
    ageRange: { min: 0, max: 0.08 },
    vitalRanges: {
      frecuenciaCardiaca: { min: 100, max: 190, warningLow: 90, warningHigh: 200, criticalLow: 80, criticalHigh: 220, unit: 'lpm' },
      presionArterialSistolica: { min: 60, max: 90, warningLow: 50, warningHigh: 100, criticalLow: 45, criticalHigh: 110, unit: 'mmHg' },
      presionArterialDiastolica: { min: 20, max: 60, warningLow: 15, warningHigh: 70, criticalLow: 10, criticalHigh: 80, unit: 'mmHg' },
      frecuenciaRespiratoria: { min: 30, max: 60, warningLow: 25, warningHigh: 70, criticalLow: 20, criticalHigh: 80, unit: 'rpm' },
      temperatura: { min: 36.5, max: 37.5, warningLow: 36.0, warningHigh: 38.0, criticalLow: 35.0, criticalHigh: 39.0, unit: 'C' },
      spo2: { min: 95, max: 100, warningLow: 92, criticalLow: 88, criticalHigh: 100, unit: '%' },
      glucosaAyunas: { min: 40, max: 100, warningLow: 40, warningHigh: 120, criticalLow: 30, criticalHigh: 200, unit: 'mg/dL' },
      glucosaPostprandial: { min: 40, max: 140, warningHigh: 160, criticalHigh: 200, unit: 'mg/dL' },
      hemoglobinaGlicosilada: { min: 4.0, max: 5.6, warningHigh: 6.5, criticalHigh: 8.0, unit: '%' }
    }
  },
  
  'lactante': {
    id: 'lactante',
    label: 'Lactante (1-12 meses)',
    icon: 'baby-outline',
    ageRange: { min: 0.08, max: 1 },
    vitalRanges: {
      frecuenciaCardiaca: { min: 90, max: 180, warningLow: 80, warningHigh: 190, criticalLow: 70, criticalHigh: 210, unit: 'lpm' },
      presionArterialSistolica: { min: 70, max: 100, warningLow: 60, warningHigh: 110, criticalLow: 50, criticalHigh: 120, unit: 'mmHg' },
      presionArterialDiastolica: { min: 50, max: 70, warningLow: 40, warningHigh: 80, criticalLow: 35, criticalHigh: 90, unit: 'mmHg' },
      frecuenciaRespiratoria: { min: 20, max: 40, warningLow: 18, warningHigh: 50, criticalLow: 15, criticalHigh: 60, unit: 'rpm' },
      temperatura: { min: 36.0, max: 37.5, warningLow: 35.5, warningHigh: 38.0, criticalLow: 35.0, criticalHigh: 39.5, unit: 'C' },
      spo2: { min: 95, max: 100, warningLow: 93, criticalLow: 90, criticalHigh: 100, unit: '%' },
      glucosaAyunas: { min: 60, max: 100, warningLow: 50, warningHigh: 120, criticalLow: 40, criticalHigh: 200, unit: 'mg/dL' },
      glucosaPostprandial: { min: 60, max: 140, warningHigh: 160, criticalHigh: 200, unit: 'mg/dL' },
      hemoglobinaGlicosilada: { min: 4.0, max: 5.6, warningHigh: 6.5, criticalHigh: 8.0, unit: '%' }
    }
  },
  
  'nino': {
    id: 'nino',
    label: 'Nino (1-10 anos)',
    icon: 'person-outline',
    ageRange: { min: 1, max: 10 },
    vitalRanges: {
      frecuenciaCardiaca: { min: 70, max: 130, warningLow: 60, warningHigh: 140, criticalLow: 50, criticalHigh: 160, unit: 'lpm' },
      presionArterialSistolica: { min: 80, max: 110, warningLow: 75, warningHigh: 120, criticalLow: 70, criticalHigh: 130, unit: 'mmHg' },
      presionArterialDiastolica: { min: 50, max: 80, warningLow: 45, warningHigh: 85, criticalLow: 40, criticalHigh: 95, unit: 'mmHg' },
      frecuenciaRespiratoria: { min: 18, max: 30, warningLow: 15, warningHigh: 35, criticalLow: 12, criticalHigh: 40, unit: 'rpm' },
      temperatura: { min: 36.0, max: 37.5, warningLow: 35.5, warningHigh: 38.0, criticalLow: 35.0, criticalHigh: 39.5, unit: 'C' },
      spo2: { min: 95, max: 100, warningLow: 94, criticalLow: 90, criticalHigh: 100, unit: '%' },
      glucosaAyunas: { min: 70, max: 100, warningLow: 60, warningHigh: 125, criticalLow: 50, criticalHigh: 300, unit: 'mg/dL' },
      glucosaPostprandial: { min: 70, max: 140, warningHigh: 180, criticalHigh: 250, unit: 'mg/dL' },
      hemoglobinaGlicosilada: { min: 4.0, max: 5.6, warningHigh: 6.5, criticalHigh: 8.5, unit: '%' }
    }
  },
  
  'adolescente': {
    id: 'adolescente',
    label: 'Adolescente (11-17 anos)',
    icon: 'person-outline',
    ageRange: { min: 11, max: 17 },
    vitalRanges: {
      frecuenciaCardiaca: { min: 60, max: 110, warningLow: 55, warningHigh: 120, criticalLow: 45, criticalHigh: 150, unit: 'lpm' },
      presionArterialSistolica: { min: 90, max: 120, warningLow: 85, warningHigh: 130, criticalLow: 80, criticalHigh: 160, unit: 'mmHg' },
      presionArterialDiastolica: { min: 60, max: 80, warningLow: 55, warningHigh: 85, criticalLow: 50, criticalHigh: 100, unit: 'mmHg' },
      frecuenciaRespiratoria: { min: 12, max: 20, warningLow: 10, warningHigh: 24, criticalLow: 8, criticalHigh: 30, unit: 'rpm' },
      temperatura: { min: 36.0, max: 37.5, warningLow: 35.5, warningHigh: 38.0, criticalLow: 35.0, criticalHigh: 39.5, unit: 'C' },
      spo2: { min: 95, max: 100, warningLow: 94, criticalLow: 90, criticalHigh: 100, unit: '%' },
      glucosaAyunas: { min: 70, max: 100, warningLow: 65, warningHigh: 125, criticalLow: 50, criticalHigh: 350, unit: 'mg/dL' },
      glucosaPostprandial: { min: 70, max: 140, warningHigh: 180, criticalHigh: 280, unit: 'mg/dL' },
      hemoglobinaGlicosilada: { min: 4.0, max: 5.6, warningHigh: 6.5, criticalHigh: 8.5, unit: '%' }
    }
  },
  
  'geriatrico': {
    id: 'geriatrico',
    label: 'Adulto Mayor (>65 anos)',
    icon: 'accessibility-outline',
    ageRange: { min: 65, max: 150 },
    vitalRanges: {
      frecuenciaCardiaca: { min: 60, max: 100, warningLow: 50, warningHigh: 110, criticalLow: 40, criticalHigh: 130, unit: 'lpm' },
      presionArterialSistolica: { min: 90, max: 140, warningLow: 90, warningHigh: 160, criticalLow: 80, criticalHigh: 190, unit: 'mmHg' },
      presionArterialDiastolica: { min: 60, max: 90, warningLow: 60, warningHigh: 100, criticalLow: 50, criticalHigh: 110, unit: 'mmHg' },
      frecuenciaRespiratoria: { min: 12, max: 24, warningLow: 10, warningHigh: 28, criticalLow: 8, criticalHigh: 32, unit: 'rpm' },
      temperatura: { min: 36.0, max: 37.2, warningLow: 35.5, warningHigh: 37.8, criticalLow: 35.0, criticalHigh: 39.0, unit: 'C' },
      spo2: { min: 94, max: 100, warningLow: 92, criticalLow: 88, criticalHigh: 100, unit: '%' },
      glucosaAyunas: { min: 80, max: 120, warningLow: 70, warningHigh: 140, criticalLow: 60, criticalHigh: 400, unit: 'mg/dL' },
      glucosaPostprandial: { min: 80, max: 160, warningHigh: 200, criticalHigh: 350, unit: 'mg/dL' },
      hemoglobinaGlicosilada: { min: 4.5, max: 6.5, warningHigh: 7.5, criticalHigh: 9.5, unit: '%' }
    }
  },
  
  'embarazada': {
    id: 'embarazada',
    label: 'Mujer Embarazada',
    icon: 'heart-outline',
    conditions: ['embarazo'],
    vitalRanges: {
      frecuenciaCardiaca: { min: 70, max: 110, warningLow: 60, warningHigh: 120, criticalLow: 50, criticalHigh: 140, unit: 'lpm' },
      presionArterialSistolica: { min: 90, max: 130, warningLow: 90, warningHigh: 140, criticalLow: 80, criticalHigh: 160, unit: 'mmHg' },
      presionArterialDiastolica: { min: 60, max: 85, warningLow: 60, warningHigh: 90, criticalLow: 50, criticalHigh: 105, unit: 'mmHg' },
      frecuenciaRespiratoria: { min: 14, max: 22, warningLow: 12, warningHigh: 26, criticalLow: 10, criticalHigh: 32, unit: 'rpm' },
      temperatura: { min: 36.0, max: 37.5, warningLow: 35.5, warningHigh: 38.0, criticalLow: 35.0, criticalHigh: 39.0, unit: 'C' },
      spo2: { min: 95, max: 100, warningLow: 94, criticalLow: 92, criticalHigh: 100, unit: '%' },
      glucosaAyunas: { min: 70, max: 95, warningLow: 70, warningHigh: 105, criticalLow: 60, criticalHigh: 200, unit: 'mg/dL' },
      glucosaPostprandial: { min: 70, max: 120, warningHigh: 140, criticalHigh: 180, unit: 'mg/dL' },
      hemoglobinaGlicosilada: { min: 4.0, max: 5.5, warningHigh: 6.0, criticalHigh: 7.0, unit: '%' }
    }
  },
  
  'hipertenso': {
    id: 'hipertenso',
    label: 'Paciente Hipertenso',
    icon: 'heart-outline',
    conditions: ['hipertension'],
    vitalRanges: {
      frecuenciaCardiaca: { min: 60, max: 100, warningLow: 50, warningHigh: 110, criticalLow: 40, criticalHigh: 140, unit: 'lpm' },
      presionArterialSistolica: { min: 110, max: 140, warningLow: 100, warningHigh: 160, criticalLow: 90, criticalHigh: 190, unit: 'mmHg' },
      presionArterialDiastolica: { min: 70, max: 90, warningLow: 65, warningHigh: 100, criticalLow: 60, criticalHigh: 115, unit: 'mmHg' },
      frecuenciaRespiratoria: { min: 12, max: 20, warningLow: 10, warningHigh: 24, criticalLow: 8, criticalHigh: 30, unit: 'rpm' },
      temperatura: { min: 36.0, max: 37.5, warningLow: 35.0, warningHigh: 38.0, criticalLow: 34.0, criticalHigh: 40.0, unit: 'C' },
      spo2: { min: 95, max: 100, warningLow: 94, criticalLow: 90, criticalHigh: 100, unit: '%' },
      glucosaAyunas: { min: 70, max: 110, warningLow: 70, warningHigh: 130, criticalLow: 50, criticalHigh: 400, unit: 'mg/dL' },
      glucosaPostprandial: { min: 70, max: 150, warningHigh: 190, criticalHigh: 320, unit: 'mg/dL' },
      hemoglobinaGlicosilada: { min: 4.0, max: 6.0, warningHigh: 7.0, criticalHigh: 9.0, unit: '%' }
    }
  },
  
  'diabetico': {
    id: 'diabetico',
    label: 'Paciente Diabetico',
    icon: 'medkit-outline',
    conditions: ['diabetes'],
    vitalRanges: {
      frecuenciaCardiaca: { min: 60, max: 100, warningLow: 50, warningHigh: 110, criticalLow: 40, criticalHigh: 140, unit: 'lpm' },
      presionArterialSistolica: { min: 90, max: 130, warningLow: 90, warningHigh: 140, criticalLow: 80, criticalHigh: 170, unit: 'mmHg' },
      presionArterialDiastolica: { min: 60, max: 85, warningLow: 60, warningHigh: 90, criticalLow: 50, criticalHigh: 105, unit: 'mmHg' },
      frecuenciaRespiratoria: { min: 12, max: 20, warningLow: 10, warningHigh: 24, criticalLow: 8, criticalHigh: 30, unit: 'rpm' },
      temperatura: { min: 36.0, max: 37.5, warningLow: 35.0, warningHigh: 38.0, criticalLow: 34.0, criticalHigh: 40.0, unit: 'C' },
      spo2: { min: 95, max: 100, warningLow: 94, criticalLow: 90, criticalHigh: 100, unit: '%' },
      glucosaAyunas: { min: 80, max: 130, warningLow: 70, warningHigh: 180, criticalLow: 60, criticalHigh: 500, unit: 'mg/dL' },
      glucosaPostprandial: { min: 80, max: 180, warningHigh: 220, criticalHigh: 400, unit: 'mg/dL' },
      hemoglobinaGlicosilada: { min: 4.5, max: 7.0, warningHigh: 8.0, criticalHigh: 10.0, unit: '%' }
    }
  },
  
  'epoc': {
    id: 'epoc',
    label: 'EPOC / Enfermedad Respiratoria',
    icon: 'leaf-outline',
    conditions: ['epoc', 'asma'],
    vitalRanges: {
      frecuenciaCardiaca: { min: 60, max: 100, warningLow: 50, warningHigh: 115, criticalLow: 40, criticalHigh: 140, unit: 'lpm' },
      presionArterialSistolica: { min: 90, max: 140, warningLow: 85, warningHigh: 150, criticalLow: 80, criticalHigh: 180, unit: 'mmHg' },
      presionArterialDiastolica: { min: 60, max: 90, warningLow: 55, warningHigh: 95, criticalLow: 50, criticalHigh: 110, unit: 'mmHg' },
      frecuenciaRespiratoria: { min: 16, max: 24, warningLow: 14, warningHigh: 28, criticalLow: 10, criticalHigh: 35, unit: 'rpm' },
      temperatura: { min: 36.0, max: 37.5, warningLow: 35.0, warningHigh: 38.0, criticalLow: 34.0, criticalHigh: 40.0, unit: 'C' },
      spo2: { min: 88, max: 100, warningLow: 88, criticalLow: 85, criticalHigh: 100, unit: '%' },
      glucosaAyunas: { min: 70, max: 110, warningLow: 70, warningHigh: 130, criticalLow: 50, criticalHigh: 400, unit: 'mg/dL' },
      glucosaPostprandial: { min: 70, max: 150, warningHigh: 190, criticalHigh: 320, unit: 'mg/dL' },
      hemoglobinaGlicosilada: { min: 4.0, max: 6.0, warningHigh: 7.0, criticalHigh: 9.0, unit: '%' }
    }
  }
};

@Component({
  selector: 'app-registroinfosignosvitales',
  templateUrl: './registroinfosignosvitales.page.html',
  styleUrls: ['./registroinfosignosvitales.page.scss'],
  standalone: false,
})
export class RegistroinfosignosvitalesPage implements OnInit, OnDestroy {

  // Info de usuario
  nombreAsistente: string = 'Enfermera';
  especialidad: string = 'Asistente Medico';
  usuario: any = null;
  
  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  private isMobile = false;
  private destroy$ = new Subject<void>();

  // Perfil del paciente
  perfilPacienteId: string = 'adulto-sano';
  perfilesDisponibles = Object.values(PATIENT_PROFILES);
  
  // Formulario
  signosVitalesForm = {
    frecuenciaCardiaca: null as number | null,
    presionArterial: '',
    frecuenciaRespiratoria: null as number | null,
    temperatura: null as number | null,
    spo2: null as number | null,
    glucosaAyunas: null as number | null,
    glucosaPostprandial: null as number | null,
    hemoglobinaGlicosilada: null as number | null
  };

  // Validaciones
  validaciones: {
    [key: string]: { estado: 'normal' | 'warning' | 'critical' | null; mensaje: string | null }
  } = {};

  // Rutas
  private readonly rutas: Record<string, string> = {
    'enfermeria': '/enfermeria',
    'enfermeriaverpacientes': '/enfermeriaverpacientes',
    'enfermeria-buscar-paciente': '/enfermeria-buscar-paciente',
    'agregar-paciente': '/enfermeria/registro',
    'enfermeria-reportes': '/enfermeria-reportes',
    'enfermeria-configuracion': '/enfermeria-configuracion'
  };

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private http: HttpClient,
    private patientService: PatientRegistrationService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private platform: Platform
  ) {
    this.platform.ready().then(() => {
      this.isMobile = this.platform.is('mobile') || this.platform.width() <= 1024;
      this.sidebarOpen = !this.isMobile;
    });
  }

  ngOnInit() {
    this.cargarDatosSesion();
    
    const registroId = this.activatedRoute.snapshot.queryParamMap.get('registro_id');
    if (registroId) {
      localStorage.setItem('registro_clinico_id', registroId);
    }
    
    this.inicializarValidaciones();
    this.cargarDatosGuardados();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private cargarDatosSesion(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.usuario = JSON.parse(userStr);
        this.nombreAsistente = this.usuario.nombre || 'Enfermera';
        this.especialidad = this.usuario.rol === 'enfermera' ? 'Asistente Medico' : 
                           this.usuario.rol === 'nutricionista' ? 'Nutricionista' : 'Personal Medico';
      } catch (e) {
        console.warn('Error parseando sesion:', e);
      }
    }
  }
  
  private inicializarValidaciones(): void {
    Object.keys(this.signosVitalesForm).forEach(key => {
      this.validaciones[key] = { estado: null, mensaje: null };
    });
  }
  
  private cargarDatosGuardados(): void {
    const datosGuardados = this.patientService.getVitalSignsData();
    if (datosGuardados) {
      this.signosVitalesForm = { ...this.signosVitalesForm, ...datosGuardados };
      this.validarTodosLosSignos();
    }
  }

  // Navegacion
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleSubmenu(menu: string): void {
    this.submenuAbierto = this.submenuAbierto === menu ? null : menu;
  }

  navegarA(rutaKey: string): void {
    const ruta = this.rutas[rutaKey] || '/enfermeria';
    this.router.navigate([ruta]);
    if (this.isMobile) this.sidebarOpen = false;
  }

  irAInicio(): void {
    this.router.navigate(['/enfermeria']);
  }

  async iniciarRegistroPaciente(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Nuevo Registro Clinico',
      message: 'Ingrese cedula, nombres y apellidos del paciente:',
      cssClass: 'alert-registro',
      inputs: [
        { name: 'cedula', type: 'tel', placeholder: 'Cedula (10 digitos)',
          attributes: { maxlength: 10, inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off' } },
        { name: 'nombres', type: 'text', placeholder: 'Nombres *' },
        { name: 'apellidos', type: 'text', placeholder: 'Apellidos *' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'alert-button-cancel' },
        {
          text: 'Iniciar Registro',
          cssClass: 'alert-button-confirm',
          handler: async (data: any) => {
            if (!data.cedula || !data.nombres || !data.apellidos) {
              await this.showToast('Complete cedula, nombres y apellidos', 'danger');
              return false;
            }
            const cedulaLimpia = data.cedula.replace(/\D/g, '');
            if (cedulaLimpia.length !== 10) {
              await this.showToast('La cedula debe tener 10 digitos', 'danger');
              return false;
            }
            if (!/^[a-zA-Z\s]+$/.test(data.nombres.trim()) || !/^[a-zA-Z\s]+$/.test(data.apellidos.trim())) {
              await this.showToast('Nombre y apellido solo deben contener letras', 'danger');
              return false;
            }
            await this.procesarInicioRegistro({
              cedula: cedulaLimpia,
              nombres: data.nombres.trim(),
              apellidos: data.apellidos.trim()
            });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private async procesarInicioRegistro(datos: any): Promise<void> {
    const loading = await this.loadingCtrl.create({ 
      message: 'Iniciando registro...', 
      spinner: 'crescent' 
    });
    await loading.present();

    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      const response: any = await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/registro/iniciar`,
        datos,
        { headers }
      ).toPromise();

      await loading.dismiss();

      if (response?.registro_id) {
        localStorage.setItem('registro_clinico_id', response.registro_id);
        await this.showToast('Registro iniciado correctamente', 'success');
        await this.router.navigate(['/registroinfopaciente'], { 
          queryParams: { 
            registro_id: response.registro_id,
            nombres: datos.nombres,
            apellidos: datos.apellidos,
            numeroIdentificacion: datos.cedula
          } 
        });
      } else {
        await this.showToast('Error: No se recibio ID de registro', 'danger');
      }
    } catch (error: any) {
      await loading.dismiss();
      await this.showToast(error?.error?.mensaje || 'Error de conexion', 'danger');
    }
  }

  // Perfil del paciente
  onPerfilPacienteChange(): void {
    console.log('[PERFIL] Perfil cambiado a:', this.perfilPacienteId);
    this.validarTodosLosSignos();
  }

  getPerfilActual(): PatientProfile {
    return PATIENT_PROFILES[this.perfilPacienteId] || PATIENT_PROFILES['adulto-sano'];
  }

  // Validacion
  validarSignoVital(campo: string, valor: number | string | null): void {
    if (valor === null || valor === '') {
      this.validaciones[campo] = { estado: null, mensaje: null };
      return;
    }

    const perfil = this.getPerfilActual();
    let rango: VitalSignRange | null = null;
    let valorNumerico: number = 0;

    switch(campo) {
      case 'frecuenciaCardiaca':
        rango = perfil.vitalRanges.frecuenciaCardiaca;
        valorNumerico = Number(valor);
        break;
      case 'presionArterial':
        if (typeof valor === 'string' && valor.includes('/')) {
          const [sys, dia] = valor.split('/').map(Number);
          this.validarValorNumerico('presionArterialSistolica', sys, perfil.vitalRanges.presionArterialSistolica);
          this.validarValorNumerico('presionArterialDiastolica', dia, perfil.vitalRanges.presionArterialDiastolica);
          
          const estadoSys = this.validaciones['presionArterialSistolica']?.estado;
          const estadoDia = this.validaciones['presionArterialDiastolica']?.estado;
          const peorEstado = estadoSys === 'critical' || estadoDia === 'critical' ? 'critical' :
                            estadoSys === 'warning' || estadoDia === 'warning' ? 'warning' : 'normal';
          
          this.validaciones['presionArterial'] = { 
            estado: peorEstado, 
            mensaje: peorEstado !== 'normal' ? `PA: ${valor} mmHg` : null 
          };
          return;
        }
        break;
      case 'frecuenciaRespiratoria':
        rango = perfil.vitalRanges.frecuenciaRespiratoria;
        valorNumerico = Number(valor);
        break;
      case 'temperatura':
        rango = perfil.vitalRanges.temperatura;
        valorNumerico = Number(valor);
        break;
      case 'spo2':
        rango = perfil.vitalRanges.spo2;
        valorNumerico = Number(valor);
        break;
      case 'glucosaAyunas':
        rango = perfil.vitalRanges.glucosaAyunas;
        valorNumerico = Number(valor);
        break;
      case 'glucosaPostprandial':
        rango = perfil.vitalRanges.glucosaPostprandial;
        valorNumerico = Number(valor);
        break;
      case 'hemoglobinaGlicosilada':
        rango = perfil.vitalRanges.hemoglobinaGlicosilada;
        valorNumerico = Number(valor);
        break;
      default:
        return;
    }

    if (rango) {
      this.validarValorNumerico(campo, valorNumerico, rango);
    }
  }

  private validarValorNumerico(campo: string, valor: number, rango: VitalSignRange): void {
    if (rango.criticalLow !== undefined && valor < rango.criticalLow) {
      this.validaciones[campo] = { 
        estado: 'critical', 
        mensaje: `Critico: ${valor} ${rango.unit} < ${rango.criticalLow}` 
      };
    } else if (rango.criticalHigh !== undefined && valor > rango.criticalHigh) {
      this.validaciones[campo] = { 
        estado: 'critical', 
        mensaje: `Critico: ${valor} ${rango.unit} > ${rango.criticalHigh}` 
      };
    } else if ((rango.warningLow !== undefined && valor < rango.warningLow) || 
               (rango.warningHigh !== undefined && valor > rango.warningHigh)) {
      this.validaciones[campo] = { 
        estado: 'warning', 
        mensaje: `Fuera de rango: ${valor} ${rango.unit}` 
      };
    } else if (valor < rango.min || valor > rango.max) {
      this.validaciones[campo] = { 
        estado: 'warning', 
        mensaje: `Fuera de rango normal: ${valor} ${rango.unit}` 
      };
    } else {
      this.validaciones[campo] = { estado: 'normal', mensaje: null };
    }
  }

  validarTodosLosSignos(): void {
    Object.entries(this.signosVitalesForm).forEach(([campo, valor]) => {
      if (valor !== null && valor !== '') {
        this.validarSignoVital(campo, valor);
      }
    });
  }

  getEstadoClase(campo: string): string {
    const estado = this.validaciones[campo]?.estado;
    switch(estado) {
      case 'critical': return 'clinical-critical';
      case 'warning': return 'clinical-warning';
      case 'normal': return 'clinical-normal';
      default: return '';
    }
  }

  getEstadoIcono(campo: string): string {
    const estado = this.validaciones[campo]?.estado;
    switch(estado) {
      case 'critical': return 'alert-circle';
      case 'warning': return 'warning';
      case 'normal': return 'checkmark-circle';
      default: return '';
    }
  }

  // Guardar y continuar
  async guardarYContinuar(): Promise<void> {
    if (!this.signosVitalesForm.frecuenciaCardiaca || !this.signosVitalesForm.presionArterial) {
      await this.showToast('Frecuencia cardiaca y presion arterial son obligatorios', 'danger');
      return;
    }

    this.validarTodosLosSignos();
    const valoresCriticos = Object.entries(this.validaciones)
      .filter(([_, v]) => v.estado === 'critical')
      .map(([k, v]) => v.mensaje);

    if (valoresCriticos.length > 0) {
      const confirm = await this.alertCtrl.create({
        header: 'Valores Criticos Detectados',
        message: valoresCriticos.join('<br>'),
        subHeader: 'Estos valores requieren atencion medica inmediata. Desea continuar?',
        cssClass: 'alert-critical',
        buttons: [
          { 
            text: 'Revisar Valores', 
            role: 'cancel',
            cssClass: 'alert-button-secondary'
          },
          { 
            text: 'Confirmar y Continuar', 
            cssClass: 'alert-button-primary',
            handler: () => this.procesarGuardado() 
          }
        ]
      });
      await confirm.present();
      return;
    }

    const valoresAlerta = Object.entries(this.validaciones)
      .filter(([_, v]) => v.estado === 'warning')
      .map(([k, v]) => v.mensaje);
    
    if (valoresAlerta.length > 0) {
      await this.showToast(`${valoresAlerta.length} valor(es) fuera de rango. Verifique.`, 'warning', 4000);
    }

    await this.procesarGuardado();
  }

  private async procesarGuardado(): Promise<void> {
    const loading = await this.loadingCtrl.create({ 
      message: 'Guardando signos vitales...', 
      spinner: 'crescent',
      cssClass: 'loading-custom'
    });
    await loading.present();

    try {
      const registroId = localStorage.getItem('registro_clinico_id');
      const token = localStorage.getItem('token');

      this.patientService.setVitalSignsData(this.signosVitalesForm);

      if (!registroId || !token) {
        await loading.dismiss();
        this.navegarSiguientePaso();
        return;
      }

      const response: any = await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/registro/${registroId}/signos-vitales`,
        {
          frecuenciaCardiaca: this.signosVitalesForm.frecuenciaCardiaca || null,
          presionArterial: this.signosVitalesForm.presionArterial || null,
          frecuenciaRespiratoria: this.signosVitalesForm.frecuenciaRespiratoria || null,
          temperatura: this.signosVitalesForm.temperatura || null,
          spo2: this.signosVitalesForm.spo2 || null,
          glucosaAyunas: this.signosVitalesForm.glucosaAyunas || null,
          glucosaPostprandial: this.signosVitalesForm.glucosaPostprandial || null,
          hemoglobinaGlicosilada: this.signosVitalesForm.hemoglobinaGlicosilada || null
        },
        { headers: this.getAuthHeaders() }
      ).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje || 'Error al guardar signos vitales');
      }

      await loading.dismiss();
      await this.showToast('Signos vitales guardados correctamente', 'success');
      this.navegarSiguientePaso(registroId);

    } catch (error: any) {
      await loading.dismiss();
      console.error('Error guardando signos vitales:', error);
      await this.showToast('Guardado localmente. Continue.', 'warning');
      this.navegarSiguientePaso();
    }
  }

  private navegarSiguientePaso(registroId?: string): void {
    const id = registroId || localStorage.getItem('registro_clinico_id') || '';
    this.router.navigate(['/registroinfoantropometricos'], { 
      queryParams: { registro_id: id } 
    });
  }

  volver(): void {
    this.router.navigate(['/registroinfopaciente'], {
      queryParams: { registro_id: localStorage.getItem('registro_clinico_id') }
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${token}` 
    });
  }

  async cerrarSesion(): Promise<void> {
    const confirm = await this.alertCtrl.create({
      header: 'Cerrar sesion',
      message: 'Esta seguro que desea cerrar sesion?',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'alert-button-cancel' },
        {
          text: 'Si, cerrar',
          cssClass: 'alert-button-confirm',
          handler: async () => {
            localStorage.clear();
            await this.showToast('Sesion cerrada exitosamente', 'success');
            this.router.navigate(['/principal'], { replaceUrl: true });
          }
        }
      ]
    });
    await confirm.present();
  }

  async showToast(message: string, color: string = 'primary', duration: number = 2500): Promise<void> {
    const toast = await this.toastCtrl.create({ 
      message, 
      duration, 
      color, 
      position: 'bottom',
      cssClass: 'toast-custom'
    });
    await toast.present();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-item-with-submenu')) {
      this.submenuAbierto = null;
    }
  }
}