import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { AlertController, LoadingController, ToastController, NavController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-principalolvidocontrasena',
  templateUrl: './principalolvidocontrasena.page.html',
  styleUrls: ['./principalolvidocontrasena.page.scss'],
  standalone: false,
})
export class PrincipalolvidocontrasenaPage implements OnInit, AfterViewInit {

  // 🎨 UI States
  cargando = false;
  pasoActual: 1 | 2 | 3 | 4 = 1;
  
  // 👁️ Toggle passwords
  mostrarNuevaPassword = false;
  mostrarConfirmarPassword = false;
  passwordsNoCoinciden = false;
  fortalezaPassword: 'weak' | 'medium' | 'strong' = 'weak';
  
  // 📱 Paso 1
  telefonoEnviado = '';
  
  // 🔢 Paso 2
  codigoCompleto = '';
  errorCodigo = false;
  mensajeErrorCodigo = '';
  tiempoResend = 0;
  timerInterval: any;
  @ViewChild('codeInputs', { read: ElementRef }) codeInputs!: ElementRef;
  
  // 🔐 Paso 3
  tokenRecuperacion = '';
  
  // 📋 Formulario
  recuperacionForm!: FormGroup;
  inputValues: { [key: string]: boolean } = {};

  // 🗺️ Rutas
  private readonly rutaLogin = '/principal';

  constructor(
    private http: HttpClient,
    private router: Router,
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private fb: FormBuilder,
    private activatedRoute: ActivatedRoute
  ) {
    this.inicializarFormulario();
  }

  ngOnInit() {
    // 👇 Verificar si viene con teléfono prellenado (opcional)
    const telefono = this.activatedRoute.snapshot.queryParamMap.get('telefono');
    if (telefono) {
      this.recuperacionForm.patchValue({ telefono: telefono });
    }
  }

  ngAfterViewInit() {
    // 👇 Enfocar primer input de código cuando llegamos al paso 2
    this.pasoActual === 2 && setTimeout(() => this.enfocarPrimerDigito(), 300);
  }

  // 🎯 Inicializar formulario con validadores de teléfono y contraseña segura
  private inicializarFormulario(): void {
    this.recuperacionForm = this.fb.group({
      telefono: ['', [
        Validators.required,
        Validators.pattern('^[0-9]{10}$'),
        Validators.minLength(10),
        Validators.maxLength(10)
      ]],
      nuevaPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        this.passwordSeguraValidator.bind(this)
      ]],
      confirmarPassword: ['', [Validators.required]]
    }, { validators: this.passwordsMatchValidator });
  }

  // 🔐 Validador personalizado: contraseña segura
  private passwordSeguraValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    if (!password) return null;
    
    const tieneMayuscula = /[A-Z]/.test(password);
    const tieneNumero = /\d/.test(password);
    const tieneEspecial = /[^a-zA-Z0-9]/.test(password);
    const longitudValida = password.length >= 8;
    
    if (!tieneMayuscula || !tieneNumero || !tieneEspecial || !longitudValida) {
      return { passwordSegura: true };
    }
    return null;
  }

  // 🔐 Validador personalizado: contraseñas deben coincidir
  private passwordsMatchValidator(form: FormGroup): ValidationErrors | null {
    const nueva = form.get('nuevaPassword')?.value;
    const confirmar = form.get('confirmarPassword')?.value;
    return nueva && confirmar && nueva !== confirmar ? { passwordsNoCoinciden: true } : null;
  }

  // 👁️ Toggle visibilidad contraseña
  togglePassword(tipo: 'nueva' | 'confirmar'): void {
    if (tipo === 'nueva') {
      this.mostrarNuevaPassword = !this.mostrarNuevaPassword;
    } else {
      this.mostrarConfirmarPassword = !this.mostrarConfirmarPassword;
    }
  }

  // 📝 Manejar cambio en inputs
  onInputChange(campo: string): void {
    const control = this.recuperacionForm.get(campo);
    this.inputValues[campo] = !!control?.value;
    
    // 👇 Calcular fortaleza de password en tiempo real
    if (campo === 'nuevaPassword') {
      this.calcularFortalezaPassword(control?.value || '');
    }
    
    // 👇 Verificar coincidencia al escribir
    if (campo === 'confirmarPassword' || campo === 'nuevaPassword') {
      this.verificarCoincidencia();
    }
  }

  // 🔙 Manejar blur
  onBlur(campo: string): void {
    this.recuperacionForm.get(campo)?.markAsTouched();
  }

  // ⚠️ Helper para errores
  hasError(campo: string): boolean {
    const control = this.recuperacionForm.get(campo);
    return !!(control?.touched && control?.invalid);
  }

  // 🔐 Verificar si contraseñas coinciden
  verificarCoincidencia(): void {
    const nueva = this.recuperacionForm.get('nuevaPassword')?.value;
    const confirmar = this.recuperacionForm.get('confirmarPassword')?.value;
    this.passwordsNoCoinciden = !!(nueva && confirmar && nueva !== confirmar);
  }

  // ✅ Validar requisitos individuales de contraseña
  validarRequisito(tipo: 'mayuscula' | 'numero' | 'longitud' | 'especial'): boolean {
    const password = this.recuperacionForm.get('nuevaPassword')?.value || '';
    
    switch(tipo) {
      case 'mayuscula': return /[A-Z]/.test(password);
      case 'numero': return /\d/.test(password);
      case 'longitud': return password.length >= 8;
      case 'especial': return /[^a-zA-Z0-9]/.test(password);
      default: return false;
    }
  }

  // 💪 Calcular fortaleza de contraseña
  private calcularFortalezaPassword(password: string): void {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) {
      this.fortalezaPassword = 'weak';
    } else if (score <= 4) {
      this.fortalezaPassword = 'medium';
    } else {
      this.fortalezaPassword = 'strong';
    }
  }

  get textoFortaleza(): string {
    const textos = {
      weak: 'Débil - Usa mayúsculas, números y símbolos',
      medium: 'Media - Agrega más caracteres especiales',
      strong: 'Fuerte - ¡Excelente contraseña!'
    };
    return textos[this.fortalezaPassword];
  }

  // ============================================
  // 📱 PASO 1: Enviar código por WhatsApp
  // ============================================
  async onSubmit(): Promise<void> {
    if (this.pasoActual === 1) {
      await this.enviarCodigoWhatsApp();
    } else if (this.pasoActual === 3) {
      await this.actualizarPassword();
    }
  }

  private async enviarCodigoWhatsApp(): Promise<void> {
    if (this.recuperacionForm.get('telefono')?.invalid) {
      this.recuperacionForm.get('telefono')?.markAsTouched();
      await this.mostrarToast('Ingresa un número de celular válido (10 dígitos)', 'danger');
      return;
    }

    this.cargando = true;
    // 👉 Normalizar teléfono: quitar espacios, guiones, agregar código país Ecuador
    const telefonoRaw = this.recuperacionForm.value.telefono.trim();
    const telefonoNormalizado = telefonoRaw.replace(/\D/g, '');
    
    // Validar formato Ecuador: 09XXXXXXXX o +5939XXXXXXXX
    const telefonoEcuador = telefonoNormalizado.startsWith('09') 
      ? `+593${telefonoNormalizado.substring(1)}` 
      : telefonoNormalizado.startsWith('593') 
        ? `+${telefonoNormalizado}` 
        : `+593${telefonoNormalizado}`;

    try {
      const response: any = await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/recuperar/solicitar-codigo-whatsapp`,
        { telefono: telefonoEcuador }
      ).toPromise();

      if (response?.error) {
        // 👉 Si el teléfono no está registrado, mostrar error específico
        if (response.mensaje?.includes('no registrado')) {
          this.recuperacionForm.get('telefono')?.setErrors({ telefonoNoRegistrado: true });
        }
        throw new Error(response.mensaje);
      }

      // 👉 Guardar datos para siguientes pasos
      this.telefonoEnviado = this.formatoTelefonoParaMostrar(telefonoEcuador);
      
      // 👉 Avanzar al paso 2
      await this.irPaso(2);
      await this.mostrarToast('Código enviado por WhatsApp ✅', 'success');
      
      // 👉 Iniciar countdown para reenvío
      this.iniciarTimerResend();

    } catch (error: any) {
      console.error('❌ Error enviando código WhatsApp:', error);
      await this.mostrarAlerta('Error', error?.message || 'No se pudo enviar el código');
    } finally {
      this.cargando = false;
    }
  }

  // 👉 Helper para mostrar teléfono con formato legible
  private formatoTelefonoParaMostrar(telefono: string): string {
  // Quitar todo lo que no sea número
  const numeros = telefono.replace(/\D/g, '');
  
  // Si viene con código de país (+593), quitarlo para formatear
  let numeroLocal = numeros;
  if (numeros.startsWith('593') && numeros.length === 12) {
    numeroLocal = numeros.substring(3); // Ej: 593963267862 → 963267862
  }
  
  // Asegurar que tenga 10 dígitos (formato local Ecuador: 09XXXXXXXX)
  if (numeroLocal.length === 9) {
    // Si faltan 1 dígito, agregar "0" al inicio
    numeroLocal = '0' + numeroLocal; // 963267862 → 0963267862
  }
  
  // Formatear: 096 326 7862
  if (numeroLocal.length === 10) {
    return `${numeroLocal.substring(0, 3)} ${numeroLocal.substring(3, 6)} ${numeroLocal.substring(6)}`;
  }
  
  // Fallback: devolver original si no se puede formatear
  return telefono;
}

  // ============================================
  // 🔢 PASO 2: Verificar código (igual que antes)
  // ============================================
  
  onCodeInput(event: any, index: number): void {
    const value = event.target.value.replace(/[^0-9]/g, '');
    event.target.value = value;
    
    if (value) {
      this.codigoCompleto = this.codigoCompleto.substring(0, index) + value + this.codigoCompleto.substring(index + 1);
      if (index < 5 && event.target.nextElementSibling) {
        (event.target.nextElementSibling as HTMLInputElement).focus();
      }
    }
    this.errorCodigo = false;
  }

  onCodeKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.codigoCompleto[index] && index > 0) {
      const inputs = this.codeInputs?.nativeElement?.querySelectorAll('.code-digit');
      if (inputs?.[index - 1]) {
        inputs[index - 1].focus();
      }
    }
  }

  onCodePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text')?.replace(/[^0-9]/g, '').slice(0, 6) || '';
    
    if (paste.length === 6) {
      this.codigoCompleto = paste;
      const inputs = this.codeInputs?.nativeElement?.querySelectorAll('.code-digit');
      inputs?.forEach((input: HTMLInputElement, i: number) => {
        input.value = paste[i] || '';
      });
      inputs?.[5]?.focus();
    }
  }

  private enfocarPrimerDigito(): void {
    const primerInput = this.codeInputs?.nativeElement?.querySelector('.code-digit');
    primerInput?.focus();
  }

  async verificarCodigo(): Promise<void> {
  if (this.codigoCompleto.length < 6) {
    await this.mostrarToast('Ingresa el código completo', 'warning');
    return;
  }

  // 👇 DEBUG: Ver qué se está enviando
  const telefonoRaw = this.recuperacionForm.value.telefono?.trim();
  const telefonoLimpio = telefonoRaw?.replace(/\D/g, '') || '';
  
  // Convertir a formato internacional para el backend
  const telefonoParaEnviar = telefonoLimpio.startsWith('0') 
    ? `+593${telefonoLimpio.substring(1)}`  // 0963267862 → +593963267862
    : telefonoLimpio.startsWith('+') 
      ? telefonoLimpio 
      : `+593${telefonoLimpio}`;

  console.log('🔍 [DEBUG] Enviando a verificar-codigo-whatsapp:', {
    telefonoRaw,
    telefonoLimpio,
    telefonoParaEnviar,
    codigo: this.codigoCompleto,
    codigoLength: this.codigoCompleto.length
  });

  this.cargando = true;
  this.errorCodigo = false;

  try {
    const response: any = await this.http.post(
      `${environment.apiUrl}/nutricionapp-api/recuperar/verificar-codigo-whatsapp`,
      { 
        telefono: telefonoParaEnviar, 
        codigo: this.codigoCompleto 
      }
    ).toPromise();

    if (response?.error) {
      this.errorCodigo = true;
      this.mensajeErrorCodigo = response.mensaje || 'Código incorrecto';
      this.codigoCompleto = '';
      this.limpiarInputsCodigo();
      this.enfocarPrimerDigito();
      return;
    }

    this.tokenRecuperacion = response.token;
    await this.irPaso(3);
    await this.mostrarToast('Código verificado ✅', 'success');

  } catch (error: any) {
    console.error('❌ Error verificando código:', error);
    
    // 👇 Mostrar mensaje más específico según el error
    let mensaje = 'Error de conexión';
    if (error?.status === 400) {
      mensaje = error?.error?.mensaje || 'Datos inválidos. Verifica el código y teléfono.';
    } else if (error?.status === 500) {
      mensaje = 'Error del servidor. Intenta más tarde.';
    }
    
    this.errorCodigo = true;
    this.mensajeErrorCodigo = mensaje;
    
    await this.mostrarToast(mensaje, 'danger');
  } finally {
    this.cargando = false;
  }
}

  private limpiarInputsCodigo(): void {
    const inputs = this.codeInputs?.nativeElement?.querySelectorAll('.code-digit');
    inputs?.forEach((input: HTMLInputElement) => input.value = '');
  }

  private iniciarTimerResend(): void {
    this.tiempoResend = 30;
    clearInterval(this.timerInterval);
    
    this.timerInterval = setInterval(() => {
      this.tiempoResend--;
      if (this.tiempoResend <= 0) {
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  async reenviarCodigo(): Promise<void> {
    if (this.cargando || this.tiempoResend > 0) return;
    await this.enviarCodigoWhatsApp();
  }

  // ============================================
  // 🔐 PASO 3: Actualizar contraseña (igual)
  // ============================================
  private async actualizarPassword(): Promise<void> {
    if (this.recuperacionForm.invalid || this.passwordsNoCoinciden) {
      Object.keys(this.recuperacionForm.controls).forEach(campo => {
        this.recuperacionForm.get(campo)?.markAsTouched();
      });
      await this.mostrarToast('Completa el formulario correctamente', 'warning');
      return;
    }

    this.cargando = true;

    try {
      const response: any = await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/recuperar/resetear-password`,
        {
          token: this.tokenRecuperacion,
          nuevaPassword: this.recuperacionForm.value.nuevaPassword
        }
      ).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      await this.irPaso(4);
      await this.mostrarToast('Contraseña actualizada ✅', 'success', 3000);

    } catch (error: any) {
      console.error('❌ Error actualizando password:', error);
      await this.mostrarAlerta('Error', error?.message || 'No se pudo actualizar la contraseña');
    } finally {
      this.cargando = false;
    }
  }

  // ============================================
  // 🔄 Navegación entre pasos
  // ============================================
  private async irPaso(paso: 1 | 2 | 3 | 4): Promise<void> {
    this.pasoActual = paso;
    if (paso === 2) {
      setTimeout(() => this.enfocarPrimerDigito(), 300);
    }
  }

  volverPaso(paso: 1 | 2 | 3): void {
    this.irPaso(paso);
    this.errorCodigo = false;
    this.codigoCompleto = '';
    this.limpiarInputsCodigo();
  }

  volverAlLogin(): void {
    this.navCtrl.navigateRoot(this.rutaLogin, { replaceUrl: true });
  }

  irAlLogin(): void {
    this.navCtrl.navigateRoot(this.rutaLogin, { 
      replaceUrl: true,
      queryParams: { loggedOut: 'true' }
    });
  }

  // ============================================
  // 🔔 Helpers de UI
  // ============================================
  private async mostrarToast(
    message: string, 
    color: 'primary'|'success'|'danger'|'warning' = 'primary', 
    duration: number = 2500
  ): Promise<void> {
    await this.toastCtrl.create({ 
      message, 
      color, 
      duration, 
      position: 'bottom',
      cssClass: 'toast-custom'
    }).then(toast => toast.present());
  }

  private async mostrarAlerta(titulo: string, mensaje: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: titulo,
      message: mensaje,
      cssClass: 'alert-custom',
      buttons: [{ text: 'Entendido', role: 'cancel' }]
    });
    await alert.present();
  }

  ngOnDestroy() {
    clearInterval(this.timerInterval);
  }
}