import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertController, LoadingController, ToastController, Platform } from '@ionic/angular';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PatientRegistrationService } from 'src/app/services/registro-paciente';

interface AntropometriaForm {
  peso: number | null;
  talla: number | null;
  imc: number | null;
  circunferenciaCintura: number | null;
}

@Component({
  selector: 'app-registroinfoantropometricos',
  templateUrl: './registroinfoantropometricos.page.html',
  styleUrls: ['./registroinfoantropometricos.page.scss'],
  standalone: false,
})
export class RegistroinfoantropometricosPage implements OnInit, OnDestroy {

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
  antropometriaForm: AntropometriaForm = {
    peso: null,
    talla: null,
    imc: null,
    circunferenciaCintura: null
  };

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
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
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

  ngOnInit() {
    this.cargarDatosSesion();
    
    const registroId = this.activatedRoute.snapshot.queryParamMap.get('registro_id');
    if (registroId) {
      localStorage.setItem('registro_clinico_id', registroId);
    }
    
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

  private cargarDatosGuardados(): void {
    const datos = this.patientService.getAnthropometricData();
    if (datos) {
      this.antropometriaForm = { ...this.antropometriaForm, ...datos };
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

  // Logica de calculo
  calcularIMC(): void {
    const { peso, talla } = this.antropometriaForm;
    if (peso !== null && talla !== null && talla > 0) {
      this.antropometriaForm.imc = Number((peso / (talla * talla)).toFixed(2));
    } else {
      this.antropometriaForm.imc = null;
    }
  }

  getClasificacionIMC(): string {
    const imc = this.antropometriaForm.imc;
    if (imc === null) return '';
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Normal';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidad';
  }

  // Guardar y navegar
  async guardarYContinuar() {
    if (!this.antropometriaForm.peso || !this.antropometriaForm.talla) {
      await this.showToast('Peso y talla son obligatorios', 'danger');
      return;
    }

    if (this.antropometriaForm.peso < 20 || this.antropometriaForm.peso > 300) {
      await this.showToast('Peso fuera de rango (20-300 kg)', 'warning');
      return;
    }
    if (this.antropometriaForm.talla < 0.5 || this.antropometriaForm.talla > 2.5) {
      await this.showToast('Talla fuera de rango (0.5-2.5 m)', 'warning');
      return;
    }

    this.calcularIMC();

    const loading = await this.loadingCtrl.create({ 
      message: 'Guardando medidas...', 
      spinner: 'crescent',
      cssClass: 'loading-custom' 
    });
    await loading.present();

    try {
      const registroId = localStorage.getItem('registro_clinico_id');
      const token = localStorage.getItem('token');

      this.patientService.setAnthropometricData(this.antropometriaForm);

      if (!registroId || !token) {
        await loading.dismiss();
        this.navegarSiguientePaso();
        return;
      }

      const response: any = await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/registro/${registroId}/antropometricos`,
        {
          peso: this.antropometriaForm.peso,
          talla: this.antropometriaForm.talla,
          circunferenciaCintura: this.antropometriaForm.circunferenciaCintura || null
        },
        { headers: this.getAuthHeaders() }
      ).toPromise();

      if (response?.error) throw new Error(response.mensaje);

      await loading.dismiss();
      await this.showToast(`Datos guardados. IMC: ${this.antropometriaForm.imc}`, 'success');
      this.navegarSiguientePaso(registroId);

    } catch (error: any) {
      await loading.dismiss();
      console.error('Error:', error);
      await this.showToast('Guardado localmente.', 'warning');
      this.navegarSiguientePaso();
    }
  }

  private navegarSiguientePaso(registroId?: string): void {
    const id = registroId || localStorage.getItem('registro_clinico_id') || '';
    this.router.navigate(['/registroinfometabolicas'], { queryParams: { registro_id: id } });
  }

  volver(): void {
    this.router.navigate(['/registroinfosignosvitales']);
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` });
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
    const toast = await this.toastCtrl.create({ message, duration, color, position: 'bottom', cssClass: 'toast-custom' });
    toast.present();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-item-with-submenu')) {
      this.submenuAbierto = null;
    }
  }
}