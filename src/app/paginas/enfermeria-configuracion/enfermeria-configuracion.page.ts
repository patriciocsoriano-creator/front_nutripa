import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-enfermeria-configuracion',
  templateUrl: './enfermeria-configuracion.page.html',
  styleUrls: ['./enfermeria-configuracion.page.scss'],
  standalone: false,
})
export class EnfermeriaConfiguracionPage implements OnInit, OnDestroy {

  // Info de usuario
  nombreAsistente: string = 'Enfermera';
  especialidad: string = 'Asistente Medico';
  usuario: any = null;
  
  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  private isMobile = false;
  private destroy$ = new Subject<void>();

  // Estado
  cargando = true;
  tabActiva: string = 'perfil';
  guardandoPassword = false;

  // Formularios
  perfilForm!: FormGroup;
  ubicacionForm!: FormGroup;
  cuentaForm!: FormGroup;
  passwordForm!: FormGroup;

  // Datos de ubicacion
  provincias: any[] = [];
  cantones: any[] = [];
  parroquias: any[] = [];

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
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private platform: Platform,
    private fb: FormBuilder
  ) {
    this.platform.ready().then(() => {
      this.isMobile = this.platform.is('mobile') || this.platform.width() <= 1024;
      this.sidebarOpen = !this.isMobile;
    });
  }

  async ngOnInit() {
    this.cargarDatosSesion();
    this.inicializarFormularios();
    await this.cargarPerfilCompleto();
    await this.cargarUbicaciones();
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

  private inicializarFormularios(): void {
    this.perfilForm = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      cedula: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      genero: [''],
      telefono: [''],
      fecha_nacimiento: ['']
    });

    this.ubicacionForm = this.fb.group({
      direccionresidencial: [''],
      ciudad: [''],
      provincia: [''],
      provincia_codigo: [''],
      canton: [''],
      canton_codigo: [''],
      parroquia: [''],
      parroquia_codigo: ['']
    });

    this.cuentaForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]]
    });

    this.passwordForm = this.fb.group({
      password_actual: ['', [Validators.required, Validators.minLength(6)]],
      password_nueva: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmar: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  private async cargarPerfilCompleto(): Promise<void> {
    this.cargando = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticacion');

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/perfil`,
        { headers }
      ).toPromise();

      if (resp?.usuario) {
        const user = resp.usuario;
        
        this.perfilForm.patchValue({
          nombre: user.nombre || '',
          apellido: user.apellido || '',
          cedula: user.cedula || '',
          genero: user.genero || '',
          telefono: user.telefono || '',
          fecha_nacimiento: user.fecha_nacimiento ? user.fecha_nacimiento.split('T')[0] : ''
        });

        this.ubicacionForm.patchValue({
          direccionresidencial: user.direccionresidencial || '',
          ciudad: user.ciudad || '',
          provincia: user.provincia || '',
          provincia_codigo: user.provincia_codigo || '',
          canton: user.canton || '',
          canton_codigo: user.canton_codigo || '',
          parroquia: user.parroquia || '',
          parroquia_codigo: user.parroquia_codigo || ''
        });

        this.cuentaForm.patchValue({
          correo: user.correo || ''
        });

        this.nombreAsistente = `${user.nombre || ''} ${user.apellido || ''}`.trim() || this.nombreAsistente;
      }
    } catch (error: any) {
      console.error('Error cargando perfil:', error);
      await this.showToast('Error al cargar datos del perfil', 'danger');
    } finally {
      this.cargando = false;
    }
  }

    private async cargarUbicaciones(): Promise<void> {
    try {
      // SIN autenticación - ruta pública
      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/ubicaciones/provincias`
      ).toPromise();

      this.provincias = resp?.provincias || [];
    } catch (error) {
      console.warn('No se pudieron cargar las provincias');
    }
  }

  async onProvinciaChange(): Promise<void> {
    const provinciaNombre = this.ubicacionForm.get('provincia')?.value;
    const provincia = this.provincias.find(p => p.nombre === provinciaNombre);
    
    if (provincia) {
      this.ubicacionForm.patchValue({ provincia_codigo: provincia.codigo });
      
      try {
        // SIN autenticación - ruta pública
        const resp: any = await this.http.get(
          `${environment.apiUrl}/nutricionapp-api/admin/ubicaciones/cantones/${provincia.codigo}`
        ).toPromise();

        this.cantones = resp?.cantones || [];
        this.ubicacionForm.patchValue({ canton: '', canton_codigo: '' });
        this.parroquias = [];
        this.ubicacionForm.patchValue({ parroquia: '', parroquia_codigo: '' });
      } catch (error) {
        console.warn('No se pudieron cargar los cantones');
      }
    }
  }

  async onCantonChange(): Promise<void> {
    const cantonNombre = this.ubicacionForm.get('canton')?.value;
    const canton = this.cantones.find(c => c.nombre === cantonNombre);
    
    if (canton) {
      this.ubicacionForm.patchValue({ canton_codigo: canton.codigo });
      
      try {
        // SIN autenticación - ruta pública
        const resp: any = await this.http.get(
          `${environment.apiUrl}/nutricionapp-api/admin/ubicaciones/parroquias/${canton.codigo}`
        ).toPromise();

        this.parroquias = resp?.parroquias || [];
        this.ubicacionForm.patchValue({ parroquia: '', parroquia_codigo: '' });
      } catch (error) {
        console.warn('No se pudieron cargar las parroquias');
      }
    }
  }

  cambiarTab(): void {
    console.log('[CONFIG] Tab activa:', this.tabActiva);
  }

  async guardarTodo(): Promise<void> {
    const perfilValido = this.perfilForm.valid || !this.perfilForm.dirty;
    const ubicacionValido = this.ubicacionForm.valid || !this.ubicacionForm.dirty;
    const cuentaValido = this.cuentaForm.valid || !this.cuentaForm.dirty;

    if (!perfilValido || !ubicacionValido || !cuentaValido) {
      await this.showToast('Por favor corrige los errores en los formularios', 'warning');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      if (this.perfilForm.dirty) {
        await this.http.put(
          `${environment.apiUrl}/nutricionapp-api/enfermeria/perfil`,
          this.perfilForm.value,
          { headers }
        ).toPromise();
      }

      if (this.ubicacionForm.dirty) {
        await this.http.put(
          `${environment.apiUrl}/nutricionapp-api/enfermeria/ubicacion`,
          this.ubicacionForm.value,
          { headers }
        ).toPromise();
      }

      if (this.cuentaForm.dirty) {
        await this.http.put(
          `${environment.apiUrl}/nutricionapp-api/enfermeria/correo`,
          { correo: this.cuentaForm.get('correo')?.value },
          { headers }
        ).toPromise();
      }

      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (this.perfilForm.dirty) {
          user.nombre = this.perfilForm.get('nombre')?.value;
          user.apellido = this.perfilForm.get('apellido')?.value;
        }
        if (this.cuentaForm.dirty) {
          user.correo = this.cuentaForm.get('correo')?.value;
        }
        localStorage.setItem('user', JSON.stringify(user));
      }

      await this.showToast('Cambios guardados correctamente', 'success');
      
      this.perfilForm.markAsPristine();
      this.ubicacionForm.markAsPristine();
      this.cuentaForm.markAsPristine();

      this.nombreAsistente = `${this.perfilForm.get('nombre')?.value} ${this.perfilForm.get('apellido')?.value}`.trim();

    } catch (error: any) {
      console.error('Error guardando cambios:', error);
      await this.showToast(error?.error?.mensaje || 'Error al guardar los cambios', 'danger');
    }
  }

  async cambiarPassword(): Promise<void> {
    if (this.passwordForm.invalid) return;

    const nueva = this.passwordForm.get('password_nueva')?.value;
    const confirmar = this.passwordForm.get('password_confirmar')?.value;

    if (nueva !== confirmar) {
      await this.showToast('Las contrasenas no coinciden', 'warning');
      return;
    }

    this.guardandoPassword = true;
    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      await this.http.put(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/password`,
        {
          password_actual: this.passwordForm.get('password_actual')?.value,
          password_nueva: nueva
        },
        { headers }
      ).toPromise();

      await this.showToast('Contrasena cambiada correctamente', 'success');
      this.passwordForm.reset();

    } catch (error: any) {
      console.error('Error cambiando contrasena:', error);
      await this.showToast(error?.error?.mensaje || 'Error al cambiar la contrasena', 'danger');
    } finally {
      this.guardandoPassword = false;
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

  async refrescarDatos(): Promise<void> {
    await this.cargarPerfilCompleto();
    await this.showToast('Datos actualizados', 'success');
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

  async showToast(message: string, color: string = 'primary', duration: number = 3000): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration, color, position: 'bottom' });
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