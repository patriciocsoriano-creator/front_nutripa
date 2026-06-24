import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AlertController, LoadingController, ToastController, Platform } from '@ionic/angular';
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
export class RegistroinfometabolicasPage implements OnInit, OnDestroy {

  // Info de usuario
  nombreAsistente: string = 'Enfermera';
  especialidad: string = 'Asistente Medico';
  usuario: any = null;
  
  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  private isMobile = false;
  private destroy$ = new Subject<void>();

  // Formulario
  metabolicasForm = {
    hipertension: false,
    obesidad: false,
    dislipidemia: false,
    higadoGraso: false,
    resistenciaInsulina: false
  };

  // Datos del paso anterior
  imcCalculado: number | null = null;
  clasificacionIMC: string = '';
  
  // Datos del paciente
  nombrePaciente: string = '---';
  identificacionPaciente: string = '---';
  actividadFisicaPaciente: string = '---';

  // Control de carga
  cargandoDatos: boolean = true;

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
    private patientService: PatientRegistrationService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private http: HttpClient,
    private platform: Platform
  ) {
    this.platform.ready().then(() => {
      this.isMobile = this.platform.is('mobile') || this.platform.width() <= 1024;
      this.sidebarOpen = !this.isMobile;
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
    await this.cargarDatosDesdeBackend();
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

  private async cargarDatosDesdeBackend(): Promise<void> {
    this.cargandoDatos = true;
    
    const registroId = localStorage.getItem('registro_clinico_id');
    const token = localStorage.getItem('token');
    
    console.log('[METABOLICAS] Iniciando carga de datos...', { registroId });
    
    if (!registroId || !token) {
      console.error('[METABOLICAS] No hay registro_id o token');
      await this.showToast('No se encontro el registro clinico', 'danger');
      this.cargandoDatos = false;
      return;
    }

    try {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });

      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/registro/${registroId}/estado`,
        { headers }
      ).toPromise();

      console.log('[METABOLICAS] Respuesta del backend:', response);

      if (response?.error) {
        throw new Error(response.mensaje || 'Error al obtener datos');
      }

      // Cargar datos del paciente
      if (response.paciente) {
        const p = response.paciente;
        this.nombrePaciente = `${p.nombres || ''} ${p.apellidos || ''}`.trim() || '---';
        this.identificacionPaciente = p.numero_identificacion || '---';
        
        if (p.actividad_fisica) {
          const etiquetas: Record<string, string> = {
            'sedentario': 'Sedentario',
            'ligera': 'Ligera',
            'moderada': 'Moderada',
            'intensa': 'Intensa',
            'atleta': 'Alto rendimiento'
          };
          this.actividadFisicaPaciente = etiquetas[p.actividad_fisica] || p.actividad_fisica;
        }
        
        console.log('[METABOLICAS] Paciente cargado:', this.nombrePaciente);
      }

      // Cargar datos antropométricos y calcular IMC
      if (response.datos?.datos_antropometricos) {
        const antro = response.datos.datos_antropometricos;
        console.log('[METABOLICAS] Datos antropometricos:', antro);
        
        if (antro.peso && antro.talla) {
          const peso = Number(antro.peso);
          const talla = Number(antro.talla);
          
          if (peso > 0 && talla > 0) {
            this.imcCalculado = Number((peso / (talla * talla)).toFixed(2));
            this.clasificacionIMC = this.getClasificacionIMC(this.imcCalculado);
            
            console.log('[METABOLICAS] IMC calculado:', this.imcCalculado, '-', this.clasificacionIMC);
            
            // AUTO-MARCAR OBESIDAD si IMC >= 30
            if (this.imcCalculado >= 30) {
              this.metabolicasForm.obesidad = true;
              console.log('[METABOLICAS] Obesidad auto-marcada (IMC >= 30)');
              await this.showToast(`IMC: ${this.imcCalculado} - Obesidad detectada. Toggle activado automaticamente.`, 'warning', 4000);
            }
          }
        }
      }

      // Cargar condiciones metabólicas ya guardadas
      if (response.datos?.condiciones_metabolicas) {
        const cond = response.datos.condiciones_metabolicas;
        console.log('[METABOLICAS] Condiciones metabolicas previas:', cond);
        
        this.metabolicasForm.hipertension = !!cond.hipertension;
        this.metabolicasForm.dislipidemia = !!cond.dislipidemia;
        this.metabolicasForm.higadoGraso = !!cond.higadoGraso;
        this.metabolicasForm.resistenciaInsulina = !!cond.resistenciaInsulina;
        
        if (!cond.obesidad && this.imcCalculado !== null && this.imcCalculado >= 30) {
          this.metabolicasForm.obesidad = true;
        } else {
          this.metabolicasForm.obesidad = !!cond.obesidad;
        }
      }

      if (response.siguientePaso === 'registrofinalizado') {
        console.log('[METABOLICAS] Registro ya finalizado');
        await this.showToast('Este registro ya fue finalizado', 'warning');
      }

    } catch (error: any) {
      console.error('[METABOLICAS] Error cargando datos:', error);
      await this.showToast(error.message || 'Error al cargar datos del paciente', 'danger');
      this.cargarDatosDesdeLocalStorage();
    } finally {
      this.cargandoDatos = false;
    }
  }

  private cargarDatosDesdeLocalStorage(): void {
    console.log('[METABOLICAS] Intentando cargar desde localStorage...');
    
    try {
      const data = this.patientService.getPatientData();
      if (data?.informacionPersonal) {
        const info = data.informacionPersonal;
        this.nombrePaciente = `${info.nombres || ''} ${info.apellidos || ''}`.trim() || '---';
        this.identificacionPaciente = info.numeroIdentificacion || '---';
        
        if (info.actividadFisica) {
          const etiquetas: Record<string, string> = {
            'sedentario': 'Sedentario',
            'ligera': 'Ligera',
            'moderada': 'Moderada',
            'intensa': 'Intensa',
            'atleta': 'Alto rendimiento'
          };
          this.actividadFisicaPaciente = etiquetas[info.actividadFisica] || info.actividadFisica;
        }
      }
      
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
      
      console.log('[METABOLICAS] Datos cargados desde localStorage');
    } catch (e) {
      console.warn('[METABOLICAS] No se pudieron cargar datos desde localStorage:', e);
    }
  }

  private getClasificacionIMC(imc: number): string {
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Normal';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidad';
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

  // Finalizar registro
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
        throw new Error('No se pudo identificar el registro clinico');
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
      await this.showToast('Registro clinico finalizado', 'success');
      
      localStorage.removeItem('registro_clinico_id');
      this.patientService.clearData();
      
      this.router.navigate(['/enfermeria'], { replaceUrl: true });

    } catch (error: any) {
      await loading.dismiss();
      console.error('Error finalizando registro:', error);
      await this.showToast(error.message || 'Error de conexion', 'danger');
    }
  }

  volver(): void {
    this.router.navigate(['/registroinfoantropometricos']);
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

  getIMCResumen(): string {
    if (this.imcCalculado === null) return '---';
    return `${this.imcCalculado} kg/m² (${this.clasificacionIMC})`;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-item-with-submenu')) {
      this.submenuAbierto = null;
    }
  }
}