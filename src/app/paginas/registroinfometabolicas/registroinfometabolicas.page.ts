import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { LoadingController, ToastController, Platform } from '@ionic/angular';
import { filter } from 'rxjs/operators';
import { takeUntil } from 'rxjs';
import { Subject } from 'rxjs';
import { PatientRegistrationService } from 'src/app/services/registro-paciente';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-registroinfometabolicas',
  templateUrl: './registroinfometabolicas.page.html',
  styleUrls: ['./registroinfometabolicas.page.scss'],
  standalone: false,
})
export class RegistroinfometabolicasPage implements OnInit {

  // 👤 Info de usuario para sidebar
  nombreAsistente: string = '';
  especialidad: string = '';
  
  // 🧭 Sidebar
  sidebarOpen = false;
  private isMobile = false;
  private destroy$ = new Subject<void>();

  // 📝 Formulario de condiciones metabólicas
  metabolicasForm = {
    hipertension: false,
    obesidad: false,
    dislipidemia: false,
    higadoGraso: false,
    resistenciaInsulina: false
  };

  // 🆕 Datos del paso anterior (antropométricos)
  imcCalculado: number | null = null;
  clasificacionIMC: string = '';
  
  // 🆕 Datos del paciente (nombre, ID, actividad física)
  nombrePaciente: string = '---';
  identificacionPaciente: string = '---';
  actividadFisicaPaciente: string = '---';

  // 🆕 Control de carga
  cargandoDatos: boolean = true;

  constructor(
    private router: Router,
    private patientService: PatientRegistrationService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private http: HttpClient,
    private platform: Platform
  ) {
    this.platform.ready().then(() => {
      this.isMobile = this.platform.is('mobile') || this.platform.width() <= 1024;
      if (!this.isMobile) {
        this.sidebarOpen = true;
      }
    });
    
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isMobile && this.sidebarOpen) {
          this.sidebarOpen = false;
        }
      });
  }

  async ngOnInit() {
    this.cargarDatosSesion();
    
    // 🆕 Cargar datos desde el backend usando el registro_id
    await this.cargarDatosDesdeBackend();
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // 👤 Cargar datos de sesión para mostrar en sidebar
  private cargarDatosSesion(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreAsistente = user.nombre || 'Enfermera';
        this.especialidad = user.rol === 'enfermera' ? 'Asistente Médico' : 
                           user.rol === 'nutricionista' ? 'Nutricionista' : 'Personal Médico';
      } catch (e) {
        console.warn('⚠️ Error parseando sesión:', e);
      }
    }
  }

  // 🆕 CARGAR TODOS LOS DATOS DESDE EL BACKEND
  private async cargarDatosDesdeBackend(): Promise<void> {
    this.cargandoDatos = true;
    
    const registroId = localStorage.getItem('registro_clinico_id');
    const token = localStorage.getItem('token');
    
    console.log('🔍 [METABÓLICAS] Iniciando carga de datos...', { registroId });
    
    if (!registroId || !token) {
      console.error('❌ [METABÓLICAS] No hay registro_id o token');
      await this.showToast('No se encontró el registro clínico', 'danger');
      this.cargandoDatos = false;
      return;
    }

    try {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });

      // 🆕 Llamar al endpoint /estado que devuelve TODO
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/registro/${registroId}/estado`,
        { headers }
      ).toPromise();

      console.log('📦 [METABÓLICAS] Respuesta del backend:', response);

      if (response?.error) {
        throw new Error(response.mensaje || 'Error al obtener datos');
      }

      // ✅ 1️⃣ Cargar datos del paciente
      if (response.paciente) {
        const p = response.paciente;
        this.nombrePaciente = `${p.nombres || ''} ${p.apellidos || ''}`.trim() || '---';
        this.identificacionPaciente = p.numero_identificacion || '---';
        
        // Actividad física con etiqueta
        if (p.actividad_fisica) {
          const etiquetas: Record<string, string> = {
            'sedentario': '🪑 Sedentario',
            'ligera': '🚶 Ligera',
            'moderada': '🏃 Moderada',
            'intensa': '🔥 Intensa',
            'atleta': '🏅 Alto rendimiento'
          };
          this.actividadFisicaPaciente = etiquetas[p.actividad_fisica] || p.actividad_fisica;
        }
        
        console.log('✅ [METABÓLICAS] Paciente cargado:', this.nombrePaciente);
      }

      // ✅ 2️⃣ Cargar datos antropométricos y calcular IMC
      if (response.datos?.datos_antropometricos) {
        const antro = response.datos.datos_antropometricos;
        console.log('📊 [METABÓLICAS] Datos antropométricos:', antro);
        
        if (antro.peso && antro.talla) {
          const peso = Number(antro.peso);
          const talla = Number(antro.talla);
          
          if (peso > 0 && talla > 0) {
            this.imcCalculado = Number((peso / (talla * talla)).toFixed(2));
            this.clasificacionIMC = this.getClasificacionIMC(this.imcCalculado);
            
            console.log('📊 [METABÓLICAS] IMC calculado:', this.imcCalculado, '-', this.clasificacionIMC);
            
            // 🎯 AUTO-MARCAR OBESIDAD si IMC >= 30
            if (this.imcCalculado >= 30) {
              this.metabolicasForm.obesidad = true;
              console.log('✅ [METABÓLICAS] Obesidad auto-marcada (IMC >= 30)');
              await this.showToast(`⚠️ IMC: ${this.imcCalculado} - Obesidad detectada. Toggle activado automáticamente.`, 'warning', 4000);
            }
          }
        }
      }

      // ✅ 3️⃣ Cargar condiciones metabólicas ya guardadas (si existen)
      if (response.datos?.condiciones_metabolicas) {
        const cond = response.datos.condiciones_metabolicas;
        console.log('🧬 [METABÓLICAS] Condiciones metabólicas previas:', cond);
        
        this.metabolicasForm.hipertension = !!cond.hipertension;
        this.metabolicasForm.dislipidemia = !!cond.dislipidemia;
        this.metabolicasForm.higadoGraso = !!cond.higadoGraso;
        this.metabolicasForm.resistenciaInsulina = !!cond.resistenciaInsulina;
        
        // Solo auto-marcar obesidad si NO venía ya guardada
        if (!cond.obesidad && this.imcCalculado !== null && this.imcCalculado >= 30) {
          this.metabolicasForm.obesidad = true;
        } else {
          this.metabolicasForm.obesidad = !!cond.obesidad;
        }
      }

      // ✅ 4️⃣ Verificar siguiente paso (si ya está finalizado, redirigir)
      if (response.siguientePaso === 'registrofinalizado') {
        console.log('✅ [METABÓLICAS] Registro ya finalizado');
        await this.showToast('Este registro ya fue finalizado', 'warning');
      }

    } catch (error: any) {
      console.error('❌ [METABÓLICAS] Error cargando datos:', error);
      await this.showToast(error.message || 'Error al cargar datos del paciente', 'danger');
      
      // 🆕 Fallback: intentar cargar desde localStorage
      this.cargarDatosDesdeLocalStorage();
    } finally {
      this.cargandoDatos = false;
    }
  }

  // 🆕 FALLBACK: Cargar datos desde localStorage si el backend falla
  private cargarDatosDesdeLocalStorage(): void {
    console.log('🔄 [METABÓLICAS] Intentando cargar desde localStorage...');
    
    // Intentar obtener datos del servicio
    try {
      const data = this.patientService.getPatientData();
      if (data?.informacionPersonal) {
        const info = data.informacionPersonal;
        this.nombrePaciente = `${info.nombres || ''} ${info.apellidos || ''}`.trim() || '---';
        this.identificacionPaciente = info.numeroIdentificacion || '---';
        
        if (info.actividadFisica) {
          const etiquetas: Record<string, string> = {
            'sedentario': '🪑 Sedentario',
            'ligera': '🚶 Ligera',
            'moderada': '🏃 Moderada',
            'intensa': '🔥 Intensa',
            'atleta': '🏅 Alto rendimiento'
          };
          this.actividadFisicaPaciente = etiquetas[info.actividadFisica] || info.actividadFisica;
        }
      }
      
      // Datos antropométricos
      const antro = this.patientService.getAnthropometricData();
      if (antro?.peso && antro?.talla) {
        const peso = Number(antro.peso);
        const talla = Number(antro.talla);
        if (peso > 0 && talla > 0) {
          this.imcCalculado = Number((peso / (talla * talla)).toFixed(2));
          this.clasificacionIMC = this.getClasificacionIMC(this.imcCalculado);
          
          if (this.imcCalculado >= 30) {
            this.metabolicasForm.obesidad = true;
          }
        }
      }
      
      console.log('✅ [METABÓLICAS] Datos cargados desde localStorage');
    } catch (e) {
      console.warn('⚠️ [METABÓLICAS] No se pudieron cargar datos desde localStorage:', e);
    }
  }

  // 📊 Clasificación del IMC
  private getClasificacionIMC(imc: number): string {
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Normal';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidad';
  }

  // 🧭 Métodos del Sidebar
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
  
  irAInicio(): void {
    this.router.navigate(['/enfermeria']);
  }

  // 💾 Finalizar registro clínico
  async finalizarRegistro() {
    const loading = await this.loadingCtrl.create({
      message: 'Finalizando registro...',
      spinner: 'crescent',
      cssClass: 'loading-custom'
    });
    await loading.present();

    try {
      const metabolicasData = {
        hipertension: this.metabolicasForm.hipertension || false,
        obesidad: this.metabolicasForm.obesidad || false,
        dislipidemia: this.metabolicasForm.dislipidemia || false,
        higadoGraso: this.metabolicasForm.higadoGraso || false,
        resistenciaInsulina: this.metabolicasForm.resistenciaInsulina || false
      };

      const registroId = localStorage.getItem('registro_clinico_id');
      const token = localStorage.getItem('token');

      if (!registroId || !token) {
        throw new Error('No se pudo identificar el registro clínico');
      }

      const response: any = await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/registro/${registroId}/metabolicas`,
        metabolicasData,
        { headers: this.getAuthHeaders() }
      ).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje || 'Error al finalizar registro');
      }

      await loading.dismiss();
      await this.showToast('✅ Registro clínico finalizado', 'success');
      
      localStorage.removeItem('registro_clinico_id');
      this.patientService.clearData();
      
      this.router.navigate(['/enfermeria'], { replaceUrl: true });

    } catch (error: any) {
      await loading.dismiss();
      console.error('❌ Error finalizando registro:', error);
      await this.showToast(error.message || 'Error de conexión', 'danger');
    }
  }

  // 🔙 Volver al paso anterior
  volver(): void {
    this.router.navigate(['/registroinfoantropometricos']);
  }

  // 🔐 Headers con token
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // 🔔 Toast notifications
  async showToast(message: string, color: string = 'primary', duration: number = 2500): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'bottom',
      icon: color === 'success' ? 'checkmark-circle' : 
            color === 'danger' ? 'alert-circle' : 'information-circle',
      cssClass: 'toast-custom'
    });
    await toast.present();
  }

  // 🆕 Mostrar IMC calculado en el resumen
  getIMCResumen(): string {
    if (this.imcCalculado === null) return '---';
    return `${this.imcCalculado} kg/m² (${this.clasificacionIMC})`;
  }
}