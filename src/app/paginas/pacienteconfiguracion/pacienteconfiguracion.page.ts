import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Canton, LocationsService, Parroquia, Provincia } from 'src/app/services/ubicaciones';

@Component({
  selector: 'app-pacienteconfiguracion',
  templateUrl: './pacienteconfiguracion.page.html',
  styleUrls: ['./pacienteconfiguracion.page.scss'],
  standalone: false
})
export class PacienteconfiguracionPage implements OnInit {

  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombrePaciente: string = '';
  cedulaPaciente: string = '';
  isMobile = false;

  perfil: any = null;
  cargando = true;
  guardando = false;

  cambioPassword = {
    passwordActual: '',
    nuevaPassword: '',
    confirmarPassword: ''
  };

  perfilOriginal: any = null;

  // Ubicaciones - usando LocationsService
  provincias: any[] = [];
  cantones: any[] = [];
  parroquias: any[] = [];
  cargandoUbicaciones = false;
  errorUbicaciones = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private locationsService: LocationsService
  ) {}

  async ngOnInit() {
    this.detectMobile();
    this.cargarDatosUsuario();
    await this.cargarUbicaciones();
    await this.cargarPerfil();
  }

  private detectMobile(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  @HostListener('window:resize')
  onResize(): void {
    const wasMobile = this.isMobile;
    this.detectMobile();
    if (wasMobile && !this.isMobile && this.sidebarOpen) {
      this.sidebarOpen = false;
      this.submenuAbierto = null;
    }
  }

  private cargarDatosUsuario(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombrePaciente = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Paciente';
        this.cedulaPaciente = user.cedula || 'Sin cedula';
      } catch (e) {
        console.warn('Error parseando usuario');
      }
    }
  }

  // ========================================
  // UBICACIONES - USANDO LOCATIONSSERVICE
  // ========================================

  async cargarUbicaciones(): Promise<void> {
    this.cargandoUbicaciones = true;
    this.errorUbicaciones = false;

    try {
      console.log('[UBICACIONES] Cargando datos de ubicaciones...');
      
      // Cargar datos desde el servicio
      await this.locationsService.loadLocations().toPromise();
      
      // Obtener provincias
      this.provincias = this.locationsService.getProvincias();
      
      console.log('[UBICACIONES] Provincias cargadas:', this.provincias.length);

      if (this.provincias.length === 0) {
        console.warn('[UBICACIONES] No hay provincias disponibles');
        this.errorUbicaciones = true;
        await this.showToast('No hay provincias disponibles', 'warning');
      }

    } catch (error: any) {
      console.error('[UBICACIONES] Error cargando ubicaciones:', error);
      this.errorUbicaciones = true;
      await this.showToast('Error al cargar ubicaciones', 'danger');
    } finally {
      this.cargandoUbicaciones = false;
    }
  }

  cargarCantones(provinciaCodigo: string): void {
    if (!provinciaCodigo) {
      this.cantones = [];
      return;
    }

    console.log('[UBICACIONES] Cargando cantones para provincia:', provinciaCodigo);
    
    this.cantones = this.locationsService.getCantonesByProvincia(provinciaCodigo);
    
    console.log('[UBICACIONES] Cantones cargados:', this.cantones.length);
  }

  cargarParroquias(provinciaCodigo: string, cantonCodigo: string): void {
    if (!provinciaCodigo || !cantonCodigo) {
      this.parroquias = [];
      return;
    }

    console.log('[UBICACIONES] Cargando parroquias para canton:', cantonCodigo);
    
    this.parroquias = this.locationsService.getParroquiasByCanton(provinciaCodigo, cantonCodigo);
    
    console.log('[UBICACIONES] Parroquias cargadas:', this.parroquias.length);
  }

  onProvinciaChange(event: any): void {
    const provinciaCodigo = event.detail.value;
    
    // Limpiar selecciones dependientes
    this.perfil.canton_codigo = '';
    this.perfil.parroquia_codigo = '';
    this.cantones = [];
    this.parroquias = [];
    
    // Cargar cantones si hay provincia seleccionada
    if (provinciaCodigo) {
      this.cargarCantones(provinciaCodigo);
    }
  }

  onCantonChange(event: any): void {
    const cantonCodigo = event.detail.value;
    
    // Limpiar parroquia
    this.perfil.parroquia_codigo = '';
    this.parroquias = [];
    
    // Cargar parroquias si hay cantón seleccionado
    if (cantonCodigo && this.perfil.provincia_codigo) {
      this.cargarParroquias(this.perfil.provincia_codigo, cantonCodigo);
    }
  }

  // ========================================
  // PERFIL
  // ========================================

  async cargarPerfil(): Promise<void> {
    this.cargando = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticacion');

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/paciente/plan/perfil`,
        { headers }
      ).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      this.perfil = response.perfil || null;
      this.perfilOriginal = JSON.parse(JSON.stringify(this.perfil));

      // Si el perfil tiene provincia, cargar cantones y parroquias
      if (this.perfil.provincia_codigo) {
        this.cargarCantones(this.perfil.provincia_codigo);
        
        if (this.perfil.canton_codigo) {
          this.cargarParroquias(this.perfil.provincia_codigo, this.perfil.canton_codigo);
        }
      }

    } catch (error: any) {
      console.error('Error cargando perfil:', error);
      await this.showToast('Error al cargar el perfil', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return 'Sin fecha';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-EC', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }

  calcularEdad(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  }

  get passwordsCoinciden(): boolean {
    return this.cambioPassword.nuevaPassword === this.cambioPassword.confirmarPassword && 
           this.cambioPassword.nuevaPassword.length > 0;
  }

  async guardarCambios(): Promise<void> {
    // Validar cambio de password si se esta modificando
    if (this.cambioPassword.nuevaPassword || this.cambioPassword.confirmarPassword) {
      if (!this.cambioPassword.passwordActual) {
        await this.showToast('Ingresa tu contrasena actual para cambiarla', 'danger');
        return;
      }
      if (this.cambioPassword.nuevaPassword !== this.cambioPassword.confirmarPassword) {
        await this.showToast('Las contrasenas nuevas no coinciden', 'danger');
        return;
      }
      if (this.cambioPassword.nuevaPassword.length < 8) {
        await this.showToast('La nueva contrasena debe tener minimo 8 caracteres', 'danger');
        return;
      }
    }

    const alert = await this.alertCtrl.create({
      header: 'Confirmar Cambios',
      message: 'Estas seguro de guardar los cambios en tu perfil?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async () => {
            await this.ejecutarGuardado();
          }
        }
      ]
    });
    await alert.present();
  }

  private async ejecutarGuardado(): Promise<void> {
    this.guardando = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticacion');

      const headers = new HttpHeaders({ 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      // Obtener nombres de provincia, cantón y parroquia
      const provinciaNombre = this.getNombreProvincia(this.perfil.provincia_codigo);
      const cantonNombre = this.getNombreCanton(this.perfil.provincia_codigo, this.perfil.canton_codigo);
      const parroquiaNombre = this.getNombreParroquia(this.perfil.provincia_codigo, this.perfil.canton_codigo, this.perfil.parroquia_codigo);

      const datosActualizar: any = {
        genero: this.perfil.genero,
        telefono: this.perfil.telefono,
        correo: this.perfil.correo,
        direccion: this.perfil.direccion,
        ciudad: this.perfil.ciudad,
        provincia: provinciaNombre,
        provincia_codigo: this.perfil.provincia_codigo,
        canton: cantonNombre,
        canton_codigo: this.perfil.canton_codigo,
        parroquia: parroquiaNombre,
        parroquia_codigo: this.perfil.parroquia_codigo
      };

      // Solo incluir password si se esta cambiando
      if (this.cambioPassword.nuevaPassword) {
        datosActualizar.passwordActual = this.cambioPassword.passwordActual;
        datosActualizar.nuevaPassword = this.cambioPassword.nuevaPassword;
      }

      const response: any = await this.http.put(
        `${environment.apiUrl}/nutricionapp-api/paciente/plan/perfil`,
        datosActualizar,
        { headers }
      ).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      await this.showToast('Perfil actualizado correctamente', 'success');
      
      // Actualizar localStorage con los nuevos datos
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.telefono = this.perfil.telefono;
        user.correo = this.perfil.correo;
        localStorage.setItem('user', JSON.stringify(user));
      }

      // Limpiar campos de password
      this.cambioPassword = {
        passwordActual: '',
        nuevaPassword: '',
        confirmarPassword: ''
      };

      // Actualizar perfil original
      this.perfilOriginal = JSON.parse(JSON.stringify(this.perfil));

    } catch (error: any) {
      console.error('Error guardando perfil:', error);
      await this.showToast(error?.message || 'Error al guardar los cambios', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  // ========================================
  // HELPERS PARA OBTENER NOMBRES
  // ========================================

  getNombreProvincia(codigo: string): string {
    if (!codigo) return '';
    const provincia = this.provincias.find(p => p.codigo === codigo);
    return provincia ? provincia.nombre : '';
  }

  getNombreCanton(provinciaCodigo: string, cantonCodigo: string): string {
    if (!provinciaCodigo || !cantonCodigo) return '';
    const cantones = this.locationsService.getCantonesByProvincia(provinciaCodigo);
    const canton = cantones.find(c => c.codigo === cantonCodigo);
    return canton ? canton.nombre : '';
  }

  getNombreParroquia(provinciaCodigo: string, cantonCodigo: string, parroquiaCodigo: string): string {
    if (!provinciaCodigo || !cantonCodigo || !parroquiaCodigo) return '';
    const parroquias = this.locationsService.getParroquiasByCanton(provinciaCodigo, cantonCodigo);
    const parroquia = parroquias.find(p => p.codigo === parroquiaCodigo);
    return parroquia ? parroquia.nombre : '';
  }

  cancelarCambios(): void {
    if (this.perfilOriginal) {
      this.perfil = JSON.parse(JSON.stringify(this.perfilOriginal));
      this.cambioPassword = {
        passwordActual: '',
        nuevaPassword: '',
        confirmarPassword: ''
      };
      
      // Recargar ubicaciones si es necesario
      if (this.perfil.provincia_codigo) {
        this.cargarCantones(this.perfil.provincia_codigo);
        if (this.perfil.canton_codigo) {
          this.cargarParroquias(this.perfil.provincia_codigo, this.perfil.canton_codigo);
        }
      }
      
      this.showToast('Cambios cancelados', 'medium');
    }
  }

  navegarA(ruta: string): void {
    this.sidebarOpen = false;
    this.submenuAbierto = null;
    const rutas: Record<string, string> = {
      'paciente': '/paciente',
      'pacienteprincipal': '/pacienteprincipal',
      'pacienteverplan': '/pacienteverplan',
      'pacienteplanhistorial': '/pacienteplanhistorial',
      'pacientedatosantropometricos': '/pacientedatosantropometricos',
      'pacienteregistrarglucosa': '/pacienteregistrarglucosa',
      'pacienteverglucosa': '/pacienteverglucosa',
      'pacienteregistrarpresion': '/pacienteregistrarpresion',
      'pacienteverpresion': '/pacienteverpresion',
      'pacientehistorialmedico': '/pacientehistorialmedico',
      'pacientemensajes': '/pacientemensajes',
      'pacienteconfiguracion': '/pacienteconfiguracion'
    };
    const destino = rutas[ruta] || `/${ruta}`;
    this.router.navigate([destino]);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    if (!this.sidebarOpen) {
      this.submenuAbierto = null;
    }
  }

  toggleSubmenu(item: string): void {
    if (this.submenuAbierto === item) {
      this.submenuAbierto = null;
    } else {
      this.submenuAbierto = item;
    }
  }

  async contactarWhatsApp(): Promise<void> {
    const mensaje = `Hola, soy ${this.nombrePaciente}. Necesito ayuda con mi cuenta.`;
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  async cerrarSesion(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar Sesion',
      message: 'Estas seguro de que deseas cerrar sesion?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cerrar',
          handler: () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            this.router.navigate(['/principal'], { replaceUrl: true });
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(message: string, color: 'primary'|'success'|'danger'|'warning'|'medium' = 'primary', duration: number = 3000): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration,
      position: 'bottom'
    });
    await toast.present();
  }
}