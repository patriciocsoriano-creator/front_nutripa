import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-medico-configuracion',
  templateUrl: './medico-configuracion.page.html',
  styleUrls: ['./medico-configuracion.page.scss'],
  standalone: false,
})
export class MedicoConfiguracionPage implements OnInit {

  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombreDoctor: string = 'Dr. Usuario';
  especialidad: string = 'Especialista';

  // Estado general
  cargando = true;
  tabActiva: string = 'perfil';
  guardandoPassword = false;

  // Formularios
  perfilForm!: FormGroup;
  ubicacionForm!: FormGroup;
  cuentaForm!: FormGroup;
  passwordForm!: FormGroup;

  // Datos de ubicación
  provincias: any[] = [];
  cantones: any[] = [];
  parroquias: any[] = [];

  // Datos del usuario
  usuarioId: string = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private fb: FormBuilder
  ) {}

  async ngOnInit() {
    this.cargarDatosUsuario();
    this.inicializarFormularios();
    await this.cargarPerfilCompleto();
    await this.cargarUbicaciones();
  }

  // Cargar datos del usuario
  private cargarDatosUsuario(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.usuarioId = user.id || '';
        this.nombreDoctor = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Dr. Usuario';
        this.especialidad = user.rol === 'medico' ? 'Médico Especialista' : 
                           user.rol === 'nutricionista' ? 'Nutricionista' : 'Especialista';
      } catch (e) {
        console.warn('Error parseando usuario');
      }
    }
  }

  // Inicializar formularios
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

  // Cargar perfil completo desde la API
  private async cargarPerfilCompleto(): Promise<void> {
    this.cargando = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticación');

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/perfil`,
        { headers }
      ).toPromise();

      if (resp?.usuario) {
        const user = resp.usuario;
        
        // Cargar formulario de perfil
        this.perfilForm.patchValue({
          nombre: user.nombre || '',
          apellido: user.apellido || '',
          cedula: user.cedula || '',
          genero: user.genero || '',
          telefono: user.telefono || '',
          fecha_nacimiento: user.fecha_nacimiento ? user.fecha_nacimiento.split('T')[0] : ''
        });

        // Cargar formulario de ubicación
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

        // Cargar formulario de cuenta
        this.cuentaForm.patchValue({
          correo: user.correo || ''
        });

        // Actualizar nombre mostrado
        this.nombreDoctor = `${user.nombre || ''} ${user.apellido || ''}`.trim() || this.nombreDoctor;
      }
    } catch (error: any) {
      console.error('Error cargando perfil:', error);
      await this.showToast('Error al cargar datos del perfil', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  // Cargar provincias, cantones y parroquias
  private async cargarUbicaciones(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/ubicaciones/provincias`,
        { headers }
      ).toPromise();

      this.provincias = resp?.provincias || [];
    } catch (error) {
      console.warn('No se pudieron cargar las provincias');
    }
  }

  // Cuando cambia la provincia
  async onProvinciaChange(): Promise<void> {
    const provinciaNombre = this.ubicacionForm.get('provincia')?.value;
    const provincia = this.provincias.find(p => p.nombre === provinciaNombre);
    
    if (provincia) {
      this.ubicacionForm.patchValue({ provincia_codigo: provincia.codigo });
      
      try {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

        const resp: any = await this.http.get(
          `${environment.apiUrl}/nutricionapp-api/ubicaciones/cantones/${provincia.codigo}`,
          { headers }
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

  // Cuando cambia el cantón
  async onCantonChange(): Promise<void> {
    const cantonNombre = this.ubicacionForm.get('canton')?.value;
    const canton = this.cantones.find(c => c.nombre === cantonNombre);
    
    if (canton) {
      this.ubicacionForm.patchValue({ canton_codigo: canton.codigo });
      
      try {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

        const resp: any = await this.http.get(
          `${environment.apiUrl}/nutricionapp-api/ubicaciones/parroquias/${canton.codigo}`,
          { headers }
        ).toPromise();

        this.parroquias = resp?.parroquias || [];
        this.ubicacionForm.patchValue({ parroquia: '', parroquia_codigo: '' });
      } catch (error) {
        console.warn('No se pudieron cargar las parroquias');
      }
    }
  }

  // Cambiar tab
  cambiarTab(): void {
    console.log('Tab activa:', this.tabActiva);
  }

  // Guardar todos los cambios
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

      // Guardar perfil
      if (this.perfilForm.dirty) {
        await this.http.put(
          `${environment.apiUrl}/nutricionapp-api/medico/perfil`,
          this.perfilForm.value,
          { headers }
        ).toPromise();
      }

      // Guardar ubicación
      if (this.ubicacionForm.dirty) {
        await this.http.put(
          `${environment.apiUrl}/nutricionapp-api/medico/ubicacion`,
          this.ubicacionForm.value,
          { headers }
        ).toPromise();
      }

      // Guardar cuenta (correo)
      if (this.cuentaForm.dirty) {
        await this.http.put(
          `${environment.apiUrl}/nutricionapp-api/medico/correo`,
          { correo: this.cuentaForm.get('correo')?.value },
          { headers }
        ).toPromise();
      }

      // Actualizar localStorage
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
      
      // Marcar formularios como prístinos
      this.perfilForm.markAsPristine();
      this.ubicacionForm.markAsPristine();
      this.cuentaForm.markAsPristine();

      // Actualizar nombre mostrado
      this.nombreDoctor = `${this.perfilForm.get('nombre')?.value} ${this.perfilForm.get('apellido')?.value}`.trim();

    } catch (error: any) {
      console.error('Error guardando cambios:', error);
      await this.showToast(error?.error?.mensaje || 'Error al guardar los cambios', 'danger');
    }
  }

  // Cambiar contraseña
  async cambiarPassword(): Promise<void> {
    if (this.passwordForm.invalid) return;

    const nueva = this.passwordForm.get('password_nueva')?.value;
    const confirmar = this.passwordForm.get('password_confirmar')?.value;

    if (nueva !== confirmar) {
      await this.showToast('Las contraseñas no coinciden', 'warning');
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
        `${environment.apiUrl}/nutricionapp-api/medico/password`,
        {
          password_actual: this.passwordForm.get('password_actual')?.value,
          password_nueva: nueva
        },
        { headers }
      ).toPromise();

      await this.showToast('Contraseña cambiada correctamente', 'success');
      this.passwordForm.reset();

    } catch (error: any) {
      console.error('Error cambiando contraseña:', error);
      await this.showToast(error?.error?.mensaje || 'Error al cambiar la contraseña', 'danger');
    } finally {
      this.guardandoPassword = false;
    }
  }

  // Navegación
  navegarA(ruta: string): void {
    this.sidebarOpen = false;
    const rutas: Record<string, string> = {
      'medico': '/medico',
      'medicoverpacientes': '/medicoverpacientes',
      'medico-agregar-paciente': '/medico-agregar-paciente',
      'medico-buscar-paciente': '/medico-buscar-paciente',
      'medicoplanesnutricionalescreados': '/medicoplanesnutricionalescreados',
      'medicoseguimientoclinico': '/medicoseguimientoclinico',
      'medicoinformes': '/reportes-medico',
      'configuracion': '/configuracion'
    };
    const destino = rutas[ruta] || '/medico';
    this.router.navigate([destino]);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleSubmenu(item: string): void {
    this.submenuAbierto = this.submenuAbierto === item ? null : item;
  }

  // Cerrar sesión
  async cerrarSesion(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'alert-button-cancel' },
        {
          text: 'Salir',
          cssClass: 'alert-button-confirm',
          handler: async () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            await this.showToast('Sesión cerrada exitosamente', 'success');
            this.router.navigate(['/principal'], { replaceUrl: true });
          }
        }
      ],
      cssClass: 'alert-logout'
    });
    await alert.present();
  }

  // Toast
  async showToast(message: string, color: 'primary' | 'success' | 'danger' | 'warning' = 'primary', duration: number = 2500): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'bottom'
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