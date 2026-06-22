import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-agregar-usuario',
  templateUrl: './admin-agregar-usuario.page.html',
  styleUrls: ['./admin-agregar-usuario.page.scss'],
  standalone: false,
})
export class AdminAgregarUsuarioPage implements OnInit {
  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombreAdmin: string = '';
  rol: string = 'Administrador';
  private isMobile = false;

  // Ubicaciones
  provincias: any[] = [];
  cantones: any[] = [];
  parroquias: any[] = [];

  // Estado del formulario
  guardando = false;
  showPassword = false;
  showConfirmPassword = false;

  // Errores de validacion
  nombreError = '';
  apellidoError = '';
  cedulaError = '';
  cedulaValida = false;
  telefonoError = '';
  correoError = '';
  passwordError = '';
  confirmarPasswordError = '';

  // Fortaleza de contrasena
  fortalezaPassword: 'weak' | 'medium' | 'strong' = 'weak';
  fortalezaPorcentaje = 0;
  fortalezaTexto = 'Debil';

  // Formulario
  form = {
    nombre: '',
    apellido: '',
    cedula: '',
    genero: '',
    telefono: '',
    correo: '',
    password: '',
    confirmarPassword: '',
    rol: '',
    direccion: '',
    ciudad: '',
    provinciaCodigo: '',
    cantonCodigo: '',
    parroquiaCodigo: ''
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private platform: Platform
  ) {
    this.platform.ready().then(() => {
      this.isMobile = this.platform.is('mobile') || this.platform.width() <= 1024;
      if (!this.isMobile) {
        this.sidebarOpen = true;
      }
    });
  }

  ngOnInit() {
    this.cargarDatosAdmin();
    this.cargarProvincias();
  }

  private cargarDatosAdmin() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreAdmin = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Administrador';
        this.rol = user.rol === 'admin' ? 'Administrador General' : 'Administrador';
      } catch (e) {
        console.warn('Error parseando usuario');
      }
    }
  }

  private async cargarProvincias() {
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/ubicaciones/provincias`
      ).toPromise();

      if (response?.error === false) {
        this.provincias = response.provincias || [];
      }
    } catch (error) {
      console.error('Error cargando provincias:', error);
    }
  }

  onProvinciaChange(codigo: string) {
    this.form.provinciaCodigo = codigo;
    this.form.cantonCodigo = '';
    this.form.parroquiaCodigo = '';
    this.cantones = [];
    this.parroquias = [];

    if (codigo) {
      this.cargarCantones(codigo);
    }
  }

  private async cargarCantones(codigoProvincia: string) {
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/ubicaciones/cantones/${codigoProvincia}`
      ).toPromise();

      if (response?.error === false) {
        this.cantones = response.cantones || [];
      }
    } catch (error) {
      console.error('Error cargando cantones:', error);
    }
  }

  onCantonChange(codigo: string) {
    this.form.cantonCodigo = codigo;
    this.form.parroquiaCodigo = '';
    this.parroquias = [];

    if (codigo) {
      this.cargarParroquias(codigo);
    }
  }

  private async cargarParroquias(codigoCanton: string) {
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/ubicaciones/parroquias/${codigoCanton}`
      ).toPromise();

      if (response?.error === false) {
        this.parroquias = response.parroquias || [];
      }
    } catch (error) {
      console.error('Error cargando parroquias:', error);
    }
  }

  // Validaciones
  validarNombre() {
    if (!this.form.nombre.trim()) {
      this.nombreError = 'El nombre es obligatorio';
    } else if (this.form.nombre.length < 2) {
      this.nombreError = 'El nombre debe tener al menos 2 caracteres';
    } else if (!/^[a-zA-Z\s]+$/.test(this.form.nombre)) {
      this.nombreError = 'El nombre solo puede contener letras';
    } else {
      this.nombreError = '';
    }
  }

  validarApellido() {
    if (!this.form.apellido.trim()) {
      this.apellidoError = 'El apellido es obligatorio';
    } else if (this.form.apellido.length < 2) {
      this.apellidoError = 'El apellido debe tener al menos 2 caracteres';
    } else if (!/^[a-zA-Z\s]+$/.test(this.form.apellido)) {
      this.apellidoError = 'El apellido solo puede contener letras';
    } else {
      this.apellidoError = '';
    }
  }

  validarCedula() {
    const cedula = this.form.cedula.replace(/\D/g, '');
    this.form.cedula = cedula;

    if (!cedula) {
      this.cedulaError = 'La cedula es obligatoria';
      this.cedulaValida = false;
      return;
    }

    if (cedula.length !== 10) {
      this.cedulaError = `La cedula debe tener 10 digitos (actual: ${cedula.length})`;
      this.cedulaValida = false;
      return;
    }

    if (this.validarCedulaEcuador(cedula)) {
      this.cedulaError = '';
      this.cedulaValida = true;
    } else {
      this.cedulaError = 'Cedula invalida: digito verificador incorrecto';
      this.cedulaValida = false;
    }
  }

  private validarCedulaEcuador(cedula: string): boolean {
    if (!/^\d{10}$/.test(cedula)) return false;

    const provincia = parseInt(cedula.substring(0, 2), 10);
    if (provincia < 1 || provincia > 24) return false;

    const tercerDigito = parseInt(cedula[2], 10);
    if (tercerDigito >= 7) return false;

    const digitos = cedula.split('').map(d => parseInt(d, 10));
    const ultimoDigito = digitos[9];

    let suma = 0;
    for (let i = 0; i < 9; i++) {
      let valor = digitos[i];
      if (i % 2 === 0) {
        valor *= 2;
        if (valor > 9) valor -= 9;
      }
      suma += valor;
    }

    const digitoVerificador = (10 - (suma % 10)) % 10;
    return digitoVerificador === ultimoDigito;
  }

  validarTelefono() {
    const telefono = this.form.telefono.replace(/\D/g, '');
    this.form.telefono = telefono;

    if (!telefono) {
      this.telefonoError = 'El telefono es obligatorio';
    } else if (telefono.length !== 10) {
      this.telefonoError = `El telefono debe tener 10 digitos (actual: ${telefono.length})`;
    } else {
      this.telefonoError = '';
    }
  }

  validarCorreo() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!this.form.correo) {
      this.correoError = 'El correo es obligatorio';
    } else if (!emailRegex.test(this.form.correo)) {
      this.correoError = 'Ingrese un correo electronico valido';
    } else {
      this.correoError = '';
    }
  }

  validarPassword() {
    const password = this.form.password;

    if (!password) {
      this.passwordError = 'La contrasena es obligatoria';
      this.fortalezaPassword = 'weak';
      this.fortalezaPorcentaje = 0;
      this.fortalezaTexto = 'Debil';
      return;
    }

    if (password.length < 8) {
      this.passwordError = 'La contrasena debe tener minimo 8 caracteres';
    } else {
      this.passwordError = '';
    }

    // Calcular fortaleza
    let puntaje = 0;
    if (password.length >= 8) puntaje++;
    if (/[A-Z]/.test(password)) puntaje++;
    if (/[a-z]/.test(password)) puntaje++;
    if (/[0-9]/.test(password)) puntaje++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) puntaje++;

    if (puntaje <= 2) {
      this.fortalezaPassword = 'weak';
      this.fortalezaPorcentaje = 33;
      this.fortalezaTexto = 'Debil';
    } else if (puntaje <= 3) {
      this.fortalezaPassword = 'medium';
      this.fortalezaPorcentaje = 66;
      this.fortalezaTexto = 'Media';
    } else {
      this.fortalezaPassword = 'strong';
      this.fortalezaPorcentaje = 100;
      this.fortalezaTexto = 'Fuerte';
    }

    // Revalidar confirmar password si ya tiene valor
    if (this.form.confirmarPassword) {
      this.validarConfirmarPassword();
    }
  }

  validarConfirmarPassword() {
    if (!this.form.confirmarPassword) {
      this.confirmarPasswordError = 'Debe confirmar la contrasena';
    } else if (this.form.password !== this.form.confirmarPassword) {
      this.confirmarPasswordError = 'Las contrasenas no coinciden';
    } else {
      this.confirmarPasswordError = '';
    }
  }

  esFormularioValido(): boolean {
    return (
      !!this.form.nombre &&
      !!this.form.apellido &&
      !!this.form.cedula &&
      this.cedulaValida &&
      !!this.form.genero &&
      !!this.form.telefono &&
      !!this.form.correo &&
      !!this.form.password &&
      !!this.form.confirmarPassword &&
      !!this.form.rol &&
      !this.nombreError &&
      !this.apellidoError &&
      !this.cedulaError &&
      !this.telefonoError &&
      !this.correoError &&
      !this.passwordError &&
      !this.confirmarPasswordError &&
      this.form.password === this.form.confirmarPassword
    );
  }

  async guardarUsuario() {
    if (!this.esFormularioValido()) {
      await this.showToast('Complete todos los campos obligatorios correctamente', 'danger');
      return;
    }

    this.guardando = true;
    const token = localStorage.getItem('token');

    try {
      const response: any = await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/admin/usuarios`,
        {
          nombre: this.form.nombre.trim(),
          apellido: this.form.apellido.trim(),
          cedula: this.form.cedula,
          genero: this.form.genero,
          telefono: this.form.telefono,
          correo: this.form.correo.toLowerCase().trim(),
          password: this.form.password,
          rol: this.form.rol
        },
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      if (response?.error === false) {
        await this.mostrarExito();
      } else {
        await this.showToast(response?.mensaje || 'Error al crear usuario', 'danger');
      }
    } catch (error: any) {
      console.error('Error creando usuario:', error);
      const mensaje = error?.error?.mensaje || 'Error al crear el usuario';
      await this.showToast(mensaje, 'danger');
    } finally {
      this.guardando = false;
    }
  }

  private async mostrarExito() {
    const alert = await this.alertCtrl.create({
      header: 'Usuario Creado',
      message: `El usuario <strong>${this.form.nombre} ${this.form.apellido}</strong> ha sido creado exitosamente.<br><br>Correo: <strong>${this.form.correo}</strong>`,
      buttons: [
        {
          text: 'Crear Otro',
          handler: () => {
            this.limpiarFormulario();
          }
        },
        {
          text: 'Ver Lista',
          handler: () => {
            this.navegarA('admin-ver-usuarios');
          }
        }
      ]
    });
    await alert.present();
  }

  limpiarFormulario() {
    this.form = {
      nombre: '',
      apellido: '',
      cedula: '',
      genero: '',
      telefono: '',
      correo: '',
      password: '',
      confirmarPassword: '',
      rol: '',
      direccion: '',
      ciudad: '',
      provinciaCodigo: '',
      cantonCodigo: '',
      parroquiaCodigo: ''
    };

    this.nombreError = '';
    this.apellidoError = '';
    this.cedulaError = '';
    this.cedulaValida = false;
    this.telefonoError = '';
    this.correoError = '';
    this.passwordError = '';
    this.confirmarPasswordError = '';
    this.fortalezaPassword = 'weak';
    this.fortalezaPorcentaje = 0;
    this.fortalezaTexto = 'Debil';
    this.cantones = [];
    this.parroquias = [];
  }

  // Navegacion
  navegarA(ruta: string): void {
    const rutas: Record<string, string> = {
      'admin-inicio': '/administrador',
      'admin-ver-usuarios': '/admin-ver-usuarios',
      'admin-agregar-usuario': '/admin-agregar-usuario',
      'admin-roles-permisos': '/admin-ver-usuarios',
      'admin-ver-medicos': '/admin-ver-medicos',
      'admin-agregar-medico': '/admin-agregar-medico',
      'admin-asignaciones': '/admin-asignaciones',
      'admin-ver-pacientes': '/admin-ver-pacientes',
      'admin-estadisticas-pacientes': '/admin-ver-pacientes',
      'admin-reportes-globales': '/admin-auditoria',
      'admin-auditoria': '/admin-auditoria',
      'admin-actividad-usuarios': '/admin-auditoria',
      'admin-config-general': '/admin-config-general',
      'admin-config-parametros': '/admin-config-parametros',
      'admin-config-backup': '/admin-config-backup'
    };

    const rutaDestino = rutas[ruta] || `/${ruta}`;
    
    if (this.isMobile) {
      this.sidebarOpen = false;
    }
    
    this.router.navigate([rutaDestino]);
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleSubmenu(item: string) {
    this.submenuAbierto = this.submenuAbierto === item ? null : item;
  }

  async cerrarSesion() {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesion',
      message: 'Esta seguro que desea cerrar sesion?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Si, cerrar',
          cssClass: 'alert-button-danger',
          handler: () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            this.router.navigate(['/principal']);
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msg, color, duration: 3000, position: 'bottom' });
    await toast.present();
  }
}