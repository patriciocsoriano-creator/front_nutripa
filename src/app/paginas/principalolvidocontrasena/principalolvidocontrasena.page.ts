import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AlertController, ToastController, NavController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-principalolvidocontrasena',
  templateUrl: './principalolvidocontrasena.page.html',
  styleUrls: ['./principalolvidocontrasena.page.scss'],
  standalone: false,
})
export class PrincipalolvidocontrasenaPage implements OnInit, AfterViewInit {

  // UI States
  cargando = false;
  pasoActual: 1 | 2 | 3 | 4 = 1;
  
  // Toggle passwords
  mostrarNuevaPassword = false;
  mostrarConfirmarPassword = false;
  passwordsNoCoinciden = false;
  fortalezaPassword: 'weak' | 'medium' | 'strong' = 'weak';
  
  // Paso 1 (AHORA EMAIL)
  correoEnviado = '';
  
  // Paso 2
  codigoCompleto = '';
  errorCodigo = false;
  mensajeErrorCodigo = '';
  tiempoResend = 0;
  timerInterval: any;
  @ViewChild('codeInputs', { read: ElementRef }) codeInputs!: ElementRef;
  
  // Paso 3
  tokenRecuperacion = '';
  
  // Formulario
  recuperacionForm!: FormGroup;
  inputValues: { [key: string]: boolean } = {};

  private readonly rutaLogin = '/principal';

  constructor(
    private http: HttpClient,
    private router: Router,
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private fb: FormBuilder,
    private activatedRoute: ActivatedRoute
  ) {
    this.inicializarFormulario();
  }

  ngOnInit() {
    const correo = this.activatedRoute.snapshot.queryParamMap.get('correo');
    if (correo) {
      this.recuperacionForm.patchValue({ correo: correo });
    }
  }

  ngAfterViewInit() {
    if (this.pasoActual === 2) {
      setTimeout(() => this.enfocarPrimerDigito(), 300);
    }
  }

  private inicializarFormulario(): void {
    this.recuperacionForm = this.fb.group({
      correo: ['', [
        Validators.required,
        Validators.email
      ]],
      nuevaPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        this.passwordSeguraValidator.bind(this)
      ]],
      confirmarPassword: ['', [Validators.required]]
    }, { validators: this.passwordsMatchValidator });
  }

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

  private passwordsMatchValidator(form: FormGroup): ValidationErrors | null {
    const nueva = form.get('nuevaPassword')?.value;
    const confirmar = form.get('confirmarPassword')?.value;
    return nueva && confirmar && nueva !== confirmar ? { passwordsNoCoinciden: true } : null;
  }

  togglePassword(tipo: 'nueva' | 'confirmar'): void {
    if (tipo === 'nueva') {
      this.mostrarNuevaPassword = !this.mostrarNuevaPassword;
    } else {
      this.mostrarConfirmarPassword = !this.mostrarConfirmarPassword;
    }
  }

  onInputChange(campo: string): void {
    const control = this.recuperacionForm.get(campo);
    this.inputValues[campo] = !!control?.value;
    
    if (campo === 'nuevaPassword') {
      this.calcularFortalezaPassword(control?.value || '');
    }
    
    if (campo === 'confirmarPassword' || campo === 'nuevaPassword') {
      this.verificarCoincidencia();
    }
  }

  onBlur(campo: string): void {
    this.recuperacionForm.get(campo)?.markAsTouched();
  }

  hasError(campo: string): boolean {
    const control = this.recuperacionForm.get(campo);
    return !!(control?.touched && control?.invalid);
  }

  verificarCoincidencia(): void {
    const nueva = this.recuperacionForm.get('nuevaPassword')?.value;
    const confirmar = this.recuperacionForm.get('confirmarPassword')?.value;
    this.passwordsNoCoinciden = !!(nueva && confirmar && nueva !== confirmar);
  }

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

  private calcularFortalezaPassword(password: string): void {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) this.fortalezaPassword = 'weak';
    else if (score <= 4) this.fortalezaPassword = 'medium';
    else this.fortalezaPassword = 'strong';
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
  // PASO 1: Enviar código por EMAIL
  // ============================================
  async onSubmit(): Promise<void> {
    if (this.pasoActual === 1) {
      await this.enviarCodigoEmail();
    } else if (this.pasoActual === 3) {
      await this.actualizarPassword();
    }
  }

  private async enviarCodigoEmail(): Promise<void> {
    if (this.recuperacionForm.get('correo')?.invalid) {
      this.recuperacionForm.get('correo')?.markAsTouched();
      await this.mostrarToast('Ingresa un correo electrónico válido', 'danger');
      return;
    }

    this.cargando = true;
    const correo = this.recuperacionForm.value.correo.trim().toLowerCase();

    try {
      const response: any = await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/recuperar/solicitar-codigo`,
        { correo: correo }
      ).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      // Ocultar el correo para mostrar parcialmente
      this.correoEnviado = this.ocultarCorreo(correo);
      
      await this.irPaso(2);
      await this.mostrarToast('Código enviado a tu correo ✅', 'success');
      this.iniciarTimerResend();

    } catch (error: any) {
      console.error('Error enviando código:', error);
      await this.mostrarAlerta('Error', error?.message || 'No se pudo enviar el código');
    } finally {
      this.cargando = false;
    }
  }

  // Ocultar partes del correo por seguridad
  private ocultarCorreo(correo: string): string {
    const [usuario, dominio] = correo.split('@');
    if (usuario.length <= 2) return correo;
    return `${usuario.substring(0, 2)}${'*'.repeat(Math.min(usuario.length - 2, 5))}@${dominio}`;
  }

  // ============================================
  // PASO 2: Verificar código
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

    const correo = this.recuperacionForm.value.correo.trim().toLowerCase();

    this.cargando = true;
    this.errorCodigo = false;

    try {
      const response: any = await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/recuperar/verificar-codigo`,
        { 
          correo: correo, 
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
      console.error('Error verificando código:', error);
      
      let mensaje = 'Error de conexión';
      if (error?.status === 400) {
        mensaje = error?.error?.mensaje || 'Código inválido o expirado';
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
    this.tiempoResend = 60; // 60 segundos para email (más lento que WhatsApp)
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
    await this.enviarCodigoEmail();
  }

  // ============================================
  // PASO 3: Actualizar contraseña
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
      console.error('Error actualizando password:', error);
      await this.mostrarAlerta('Error', error?.message || 'No se pudo actualizar la contraseña');
    } finally {
      this.cargando = false;
    }
  }

  // ============================================
  // Navegación entre pasos
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
  // Helpers de UI
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
      position: 'bottom'
    }).then(toast => toast.present());
  }

  private async mostrarAlerta(titulo: string, mensaje: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: titulo,
      message: mensaje,
      buttons: [{ text: 'Entendido', role: 'cancel' }]
    });
    await alert.present();
  }

  ngOnDestroy() {
    clearInterval(this.timerInterval);
  }
}