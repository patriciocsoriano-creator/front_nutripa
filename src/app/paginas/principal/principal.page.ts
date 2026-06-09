import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, NavController, ToastController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-principal',
  templateUrl: './principal.page.html',
  styleUrls: ['./principal.page.scss'],
  standalone: false,
})
export class PrincipalPage implements OnInit {

  // 🎨 UI States
  cargando = false;
  mostrarPassword = false;
  mostrandoMensajeLogout = false;
  inputValues: { [key: string]: boolean } = {};

  // 📋 Formulario reactivo
  loginForm!: FormGroup;

  // 🗺️ Mapa centralizado de rutas por rol
  private readonly rutasPorRol: Record<string, string> = {
    'admin': '/administrador',
    'doctor': '/medico',
    'nutricionista': '/medico',
    'enfermera': '/enfermeria',
    'paciente': '/paciente'
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private fb: FormBuilder
  ) { 
    this.inicializarFormulario();
  }

  // 🎯 Inicializar formulario con validadores
  private inicializarFormulario(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async ngOnInit() {
    // 👇 Mostrar mensaje si viene de logout
    const loggedOut = this.activatedRoute.snapshot.queryParamMap.get('loggedOut');
    if (loggedOut === 'true' && !this.mostrandoMensajeLogout) {
      this.mostrandoMensajeLogout = true;
      await this.showToast('Sesión cerrada exitosamente', 'success', 2500);
    }

    // 👇 Verificar sesión activa (opcional)
    await this.verificarSesionActiva();
  }

  // 🔍 Verificar si hay sesión activa y validar token con backend
  private async verificarSesionActiva(): Promise<void> {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      console.log('🔍 [SESSION] No hay datos en localStorage');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      console.log('🔍 [SESSION] Validando token con backend...');

      const esValido = await this.validarTokenConBackend(token);
      
      if (esValido) {
        console.log('✅ [SESSION] Token válido');
        await this.redirigirSegunRol(user.rol);
      } else {
        console.warn('⚠️ [SESSION] Token inválido');
        this.limpiarSesion();
      }
      
    } catch (e) {
      console.warn('⚠️ [SESSION] Error:', e);
      this.limpiarSesion();
    }
  }

  // 🔐 Validar token con endpoint del backend
  private async validarTokenConBackend(token: string): Promise<boolean> {
    try {
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/pacientes`,
        { headers, observe: 'response' }
      ).toPromise();

      return true;

    } catch (error: any) {
      if (error?.status === 401 || error?.status === 403) {
        console.log('🔐 [VALIDATE] Token inválido o expirado');
        return false;
      }
      console.warn('⚠️ [VALIDATE] Error de conexión, asumiendo válido');
      return true;
    }
  }

  // 👁️ Toggle visibilidad de contraseña
  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  // 📝 Manejar cambio en inputs para floating label
  onInputChange(campo: string): void {
    const control = this.loginForm.get(campo);
    this.inputValues[campo] = !!control?.value;
  }

  // 🔙 Manejar blur para validación
  onBlur(campo: string): void {
    this.loginForm.get(campo)?.markAsTouched();
  }

  // ⚠️ Helper para verificar errores (usa en HTML con *ngIf)
  hasError(campo: string): boolean {
    const control = this.loginForm.get(campo);
    return !!(control?.touched && control?.invalid);
  }

  // 🎨 Helper para clase CSS de error
  getErrorClass(campo: string): string {
    return this.hasError(campo) ? 'has-error' : '';
  }

  // 🔐 Función principal de inicio de sesión
  async iniciarSesion(): Promise<void> {
    console.log('🔐 [LOGIN] iniciarSesion() llamado');

    // 👇 Validación temprana
    if (this.loginForm.invalid) {
      console.warn('⚠️ [LOGIN] Formulario inválido');
      this.marcarCamposComoTouched();
      const errorMessage = this.getErrorMessage();
      await this.mostrarAlerta('Campos incompletos', errorMessage);
      return;
    }

    console.log('✅ [LOGIN] Formulario válido');
    this.cargando = true;

    const loading = await this.loadingCtrl.create({
      message: 'Verificando credenciales...',
      spinner: 'crescent',
      cssClass: 'loading-custom'
    });
    await loading.present();

    try {
      const payload = {
        email: this.loginForm.value.email?.trim().toLowerCase(),
        password: this.loginForm.value.password
      };

      const apiUrl = `${environment.apiUrl}/login`;
      console.log('📤 [LOGIN] POST →', apiUrl);

      const response: any = await this.http.post(apiUrl, payload).toPromise();
      console.log('📥 [LOGIN] Respuesta:', response);

      // 👇 Validar respuesta del backend
      if (response?.error) {
        throw new Error(response.mensaje || 'Credenciales incorrectas');
      }

      if (!response?.token) {
        throw new Error('Respuesta inválida del servidor');
      }

      // 👇 Guardar sesión
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.usuario));
      console.log('💾 [LOGIN] Sesión guardada');

      // 👇 Redirigir según rol
      await this.redirigirSegunRol(response.usuario.rol);

    } catch (error: any) {
      console.error('💥 [LOGIN] ERROR:', error);
      await this.manejarErrorLogin(error);
      
    } finally {
      await loading.dismiss();
      this.cargando = false;
      console.log('🔚 [LOGIN] Proceso finalizado');
    }
  }

  // 🔀 Redirigir según rol del usuario
  private async redirigirSegunRol(rol: string | undefined | null): Promise<void> {
    const rolNormalizado = rol?.toLowerCase().trim();
    const ruta = this.rutasPorRol[rolNormalizado || ''] || '/principal';
    
    console.log('🗺️ [REDIRECCIÓN] →', ruta);
    
    await this.navCtrl.navigateRoot(ruta, { 
      replaceUrl: true,
      animated: true 
    });
  }

  // 🧹 Limpiar sesión de forma segura
  private limpiarSesion(): void {
    console.log('🧹 [SESSION] Limpiando datos');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_data');
  }

  // 🎨 Helpers de formulario
  private marcarCamposComoTouched(): void {
    Object.keys(this.loginForm.controls).forEach(campo => {
      this.loginForm.get(campo)?.markAsTouched();
    });
  }

  private getErrorMessage(): string {
    const email = this.loginForm.get('email');
    const password = this.loginForm.get('password');
    
    if (email?.errors?.['required']) return 'El email es requerido';
    if (email?.errors?.['email']) return 'Ingrese un email válido';
    if (password?.errors?.['required']) return 'La contraseña es requerida';
    if (password?.errors?.['minlength']) return 'Mínimo 6 caracteres';
    
    return 'Complete el formulario correctamente';
  }

  // 🔔 Manejar errores de login con mensajes amigables
  private async manejarErrorLogin(error: any): Promise<void> {
    let mensaje = 'Error al iniciar sesión';
    
    if (error?.status === 0) {
      mensaje = 'No se pudo conectar con el servidor.\n\nVerifica que:\n• La API esté corriendo en puerto 3000\n• No haya errores de CORS';
    } else if (error?.status === 401) {
      mensaje = 'Credenciales incorrectas.\nVerifica tu correo y contraseña.';
    } else if (error?.status === 404) {
      mensaje = 'Endpoint no encontrado.\nVerifica la URL de la API en environment.ts';
    } else if (error?.status === 500) {
      mensaje = 'Error interno del servidor.\nIntenta más tarde.';
    } else if (error?.message) {
      mensaje = error.message;
    }

    await this.mostrarAlerta('Error de conexión', mensaje);
  }

  // 🔔 Mostrar alerta personalizada
  private async mostrarAlerta(titulo: string, mensaje: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: titulo,
      message: mensaje,
      cssClass: 'alert-custom',
      buttons: [{
        text: 'Entendido',
        role: 'cancel',
        cssClass: 'alert-button-confirm'
      }]
    });
    await alert.present();
  }

  // 🔔 Mostrar toast notification
  private async showToast(
    message: string, 
    color: 'primary'|'success'|'danger'|'warning' = 'primary', 
    duration: number = 3000
  ): Promise<void> {
    const toast = await this.toastCtrl.create({ 
      message, 
      color, 
      duration, 
      position: 'bottom',
      cssClass: 'toast-custom'
    });
    await toast.present();
  }

  // 🔗 Navegación a registro
  irARegistro(): void {
    this.router.navigate(['/principalregistro']);
  }

  // 🔗 Navegación a recuperación de contraseña
  recuperarPassword(): void {
    this.router.navigate(['/principalolvidocontrasena']);
  }

  // 🚪 Cerrar sesión (puedes llamarlo desde un menú o botón)
  async cerrarSesion(): Promise<void> {
    console.log('🔐 [LOGOUT] Cerrando sesión...');
    
    this.limpiarSesion();
    await this.showToast('Sesión cerrada exitosamente', 'success', 2000);
    
    await this.router.navigate(['/principal'], { 
      replaceUrl: true,
      queryParams: { loggedOut: 'true' }
    });
    
    console.log('🔄 [LOGOUT] Redirigiendo a login');
  }
}