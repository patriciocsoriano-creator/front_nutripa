import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoadingController, ToastController, Platform, AlertController } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { PatientRegistrationService } from 'src/app/services/registro-paciente';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-registroinfopaciente',
  templateUrl: './registroinfopaciente.page.html',
  styleUrls: ['./registroinfopaciente.page.scss'],
  standalone: false,
})
export class RegistroinfopacientePage implements OnInit, OnDestroy {

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
  pacienteForm = {
    nombres: '',
    apellidos: '',
    numeroIdentificacion: '',
    fechaNacimiento: '',
    sexo: '',
    direccion: '',
    telefono: '',
    ocupacion: '',
    actividadFisica: ''
  };

  // Edad calculada
  edadCalculada: number | null = null;
  
  // Estados de carga y modo
  cargandoDatos = true;
  datosPrellenados = false;
  campoBloqueado = false;
  
  // Detectar si es nueva cita de paciente existente
  esNuevaCita = false;
  esPacienteExistente = false;
  esPacienteNuevo = false;

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

  async ngOnInit() {
    this.cargarDatosSesion();
    await this.cargarDatosRegistro();
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

  private async cargarDatosRegistro(): Promise<void> {
    this.cargandoDatos = true;
    
    const registroId = this.activatedRoute.snapshot.queryParamMap.get('registro_id') 
                       || localStorage.getItem('registro_clinico_id');
    
    const params = this.activatedRoute.snapshot.queryParamMap;
    this.esNuevaCita = params.get('nueva_cita') === 'true';
    this.esPacienteExistente = params.get('paciente_existente') === 'true';
    
    console.log('[REGISTRO] Flags detectados:', {
      registroId,
      esNuevaCita: this.esNuevaCita,
      esPacienteExistente: this.esPacienteExistente
    });
    
    if (!registroId) {
      console.warn('No hay registro_id, mostrando formulario vacio');
      this.esPacienteNuevo = true;
      this.cargandoDatos = false;
      return;
    }

    localStorage.setItem('registro_clinico_id', registroId);

    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 
        'Authorization': `Bearer ${token}` 
      });

      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/registro/${registroId}/estado`,
        { headers }
      ).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      console.log('[REGISTRO] Datos cargados:', response);

      // SMART REDIRECT
      if (response.pasosCompletos?.datos_personales && !this.esNuevaCita) {
        console.log('[SMART] datos_personales ya completo, redirigiendo a:', response.siguientePaso);
        await this.showToast('Este paso ya fue completado. Redirigiendo...', 'primary');
        
        setTimeout(() => {
          this.router.navigate([`/${response.siguientePaso}`], {
            queryParams: { registro_id: registroId }
          });
        }, 1000);
        return;
      }

      // PRE-LLENAR
      if (response.paciente) {
        const p = response.paciente;
        
        if (this.esNuevaCita && this.esPacienteExistente) {
          this.campoBloqueado = true;
          this.datosPrellenados = true;
          
          console.log('[NUEVA CITA] Pre-llenando datos del paciente existente');
          
          this.pacienteForm.nombres = p.nombres || params.get('nombres') || '';
          this.pacienteForm.apellidos = p.apellidos || params.get('apellidos') || '';
          this.pacienteForm.numeroIdentificacion = p.numero_identificacion || params.get('numeroIdentificacion') || '';
          this.pacienteForm.fechaNacimiento = p.fecha_nacimiento || '';
          this.pacienteForm.sexo = p.sexo || '';
          this.pacienteForm.direccion = p.direccion || '';
          this.pacienteForm.telefono = p.telefono || '';
          this.pacienteForm.ocupacion = p.ocupacion || '';
          this.pacienteForm.actividadFisica = p.actividad_fisica || '';
          
          await this.showToast('Nueva cita: Datos del paciente cargados. Verifique y actualice si es necesario.', 'success', 4000);
          
        } else if (p.numero_identificacion || p.nombres) {
          this.campoBloqueado = true;
          this.datosPrellenados = true;
          
          this.pacienteForm.nombres = p.nombres || '';
          this.pacienteForm.apellidos = p.apellidos || '';
          this.pacienteForm.numeroIdentificacion = p.numero_identificacion || '';
          this.pacienteForm.fechaNacimiento = p.fecha_nacimiento || '';
          this.pacienteForm.sexo = p.sexo || '';
          this.pacienteForm.direccion = p.direccion || '';
          this.pacienteForm.telefono = p.telefono || '';
          this.pacienteForm.ocupacion = p.ocupacion || '';
          this.pacienteForm.actividadFisica = p.actividad_fisica || '';
          
          console.log('[PRE-FILL] Formulario pre-llenado con datos del paciente');
        } else {
          this.esPacienteNuevo = true;
          
          this.pacienteForm.nombres = params.get('nombres') || '';
          this.pacienteForm.apellidos = params.get('apellidos') || '';
          this.pacienteForm.numeroIdentificacion = params.get('numeroIdentificacion') || '';
          
          console.log('[PACIENTE NUEVO] Formulario vacio para nuevo paciente');
        }
      } else {
        this.esPacienteNuevo = true;
        this.pacienteForm.nombres = params.get('nombres') || '';
        this.pacienteForm.apellidos = params.get('apellidos') || '';
        this.pacienteForm.numeroIdentificacion = params.get('numeroIdentificacion') || '';
      }

      if (this.pacienteForm.fechaNacimiento) {
        this.calcularEdad();
      }

    } catch (error: any) {
      console.error('Error cargando datos del registro:', error);
      this.prellenarDesdeQueryParams();
    } finally {
      this.cargandoDatos = false;
    }
  }

  private prellenarDesdeQueryParams(): void {
    const params = this.activatedRoute.snapshot.queryParamMap;
    const nombres = params.get('nombres');
    const apellidos = params.get('apellidos');
    const cedula = params.get('numeroIdentificacion');
    
    if (nombres || apellidos || cedula) {
      console.log('[FALLBACK] Pre-llenando con queryParams:', { nombres, apellidos, cedula });
      if (nombres) this.pacienteForm.nombres = nombres;
      if (apellidos) this.pacienteForm.apellidos = apellidos;
      if (cedula) this.pacienteForm.numeroIdentificacion = cedula;
      this.esPacienteNuevo = true;
    }
  }

  calcularEdad(): void {
    const fecha = this.pacienteForm.fechaNacimiento;
    
    if (!fecha) {
      this.edadCalculada = null;
      return;
    }
    
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(fecha)) {
      console.log('[EDAD] Formato de fecha invalido:', fecha);
      this.edadCalculada = null;
      return;
    }
    
    const nacimiento = new Date(fecha);
    
    if (isNaN(nacimiento.getTime())) {
      console.log('[EDAD] Fecha invalida:', fecha);
      this.edadCalculada = null;
      return;
    }
    
    const hoy = new Date();
    
    if (nacimiento > hoy) {
      console.log('[EDAD] Fecha futura:', fecha);
      this.edadCalculada = null;
      return;
    }
    
    const anioNacimiento = nacimiento.getFullYear();
    if (anioNacimiento < 1900 || anioNacimiento > hoy.getFullYear()) {
      console.log('[EDAD] Anio fuera de rango:', anioNacimiento);
      this.edadCalculada = null;
      return;
    }
    
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    this.edadCalculada = edad >= 0 && edad <= 120 ? edad : null;
    console.log('[EDAD] Calculada correctamente:', this.edadCalculada, 'anos (fecha:', fecha, ')');
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

  // Guardar y continuar
  async guardarYContinuar(): Promise<void> {
    if (!this.pacienteForm.nombres || !this.pacienteForm.apellidos || !this.pacienteForm.numeroIdentificacion) {
      await this.showToast('Complete nombre, apellido y cedula', 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({ 
      message: 'Guardando datos...', 
      spinner: 'crescent',
      cssClass: 'loading-custom'
    });
    await loading.present();

    try {
      const registroId = localStorage.getItem('registro_clinico_id');
      const token = localStorage.getItem('token');

      this.patientService.setPersonalData(this.pacienteForm);

      if (!registroId || !token) {
        await loading.dismiss();
        this.navegarSiguientePaso();
        return;
      }

      const response: any = await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/registro/${registroId}/datos-personales`,
        {
          fechaNacimiento: this.pacienteForm.fechaNacimiento || null,
          sexo: this.pacienteForm.sexo || null,
          direccion: this.pacienteForm.direccion || null,
          telefono: this.pacienteForm.telefono || null,
          ocupacion: this.pacienteForm.ocupacion || null,
          actividadFisica: this.pacienteForm.actividadFisica || null
        },
        { headers: new HttpHeaders({ 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        })}
      ).toPromise();

      if (response?.error) throw new Error(response.mensaje);

      await loading.dismiss();
      this.navegarSiguientePaso(registroId);
      await this.showToast('Datos guardados correctamente', 'success');

    } catch (error: any) {
      await loading.dismiss();
      console.error('Error guardando:', error);
      await this.showToast('Datos guardados localmente. Continue.', 'warning');
      this.navegarSiguientePaso();
    }
  }

  private navegarSiguientePaso(registroId?: string): void {
    const id = registroId || localStorage.getItem('registro_clinico_id') || '';
    this.router.navigate(['/registroinfosignosvitales'], { 
      queryParams: { registro_id: id } 
    });
  }

  cancelar(): void {
    this.patientService.clearData();
    localStorage.removeItem('registro_clinico_id');
    this.router.navigate(['/enfermeria']);
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