import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { GeneralService } from 'src/app/services/general';
import { Canton, LocationsService, Parroquia, Provincia } from 'src/app/services/ubicaciones';

@Component({
  selector: 'app-principalregistro',
  templateUrl: './principalregistro.page.html',
  styleUrls: ['./principalregistro.page.scss'],
  standalone: false,
})
export class PrincipalregistroPage implements OnInit {

  // 🇪🇨 Lista de géneros
  generos = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Femenino' },
    { value: 'O', label: 'Otro' }
  ];

  // 👥 Opciones de rol con iconos
  roles = [
    { value: 'paciente', label: 'Paciente', icon: 'person-outline' },
    { value: 'nutricionista', label: 'Nutricionista', icon: 'restaurant-outline' },
    { value: 'enfermera', label: 'Enfermera', icon: 'heart-outline' },
    { value: 'admin', label: 'Administrador', icon: 'settings-outline' }
  ];

  // 🌍 Datos de ubicaciones
  provincias: Provincia[] = [];
  cantones: Canton[] = [];
  parroquias: Parroquia[] = [];
  isLoadingLocations = false;
  locationsError = false;

  // 🔐 Estados de UI
  showPassword = false;
  showConfirmPassword = false;

  // ⚠️ Mensajes de validación
  cedulaError = '';
  cedulaValida = false;
  telefonoError = '';
  passwordError = '';

  // 🆕 Estados para autocompletado
  pacienteEncontrado = false;
  pacienteIdExistente: string | null = null;
  buscandoPaciente = false;
  mensajeAutocompletado = '';

  // 🆕 NUEVO: Seguridad de contraseña
  seguridadPassword = {
    nivel: 'muy_debil' as 'muy_debil' | 'debil' | 'media' | 'fuerte' | 'muy_fuerte',
    texto: 'Muy débil',
    porcentaje: 10,
    requisitos: {
      longitud: false,
      mayuscula: false,
      minuscula: false,
      numero: false,
      especial: false
    }
  };
  passwordsCoinciden = false;

  // 📝 Formulario de registro completo
  registroForm = {
    nombre: '',
    apellido: '',
    fechaNacimiento: '',
    edad: null as number | null,
    cedula: '',
    genero: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    provinciaCodigo: '',
    canton: '',
    cantonCodigo: '',
    parroquia: '',
    parroquiaCodigo: '',
    correo: '',
    password: '',
    confirmarPassword: '',
    rol: '',
    aceptaTerminos: false
  };

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private generalService: GeneralService,
    private locationsService: LocationsService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
    this.cargarUbicaciones();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 🔹 Método helper para fecha máxima
  getFechaMaxima(): string {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  }

  // 🎂 Calcular edad automáticamente
  calcularEdad(): void {
    const fecha = this.registroForm.fechaNacimiento;
    
    if (!fecha) {
      this.registroForm.edad = null;
      return;
    }

    const nacimiento = new Date(fecha);
    
    if (isNaN(nacimiento.getTime())) {
      this.registroForm.edad = null;
      return;
    }

    const hoy = new Date();
    
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    this.registroForm.edad = edad >= 0 && edad <= 120 ? edad : null;
  }

  // 🆕 NUEVO: Calcular seguridad de la contraseña
  calcularSeguridadPassword(): void {
    const password = this.registroForm.password || '';
    
    // Verificar requisitos individuales
    const tieneLongitud = password.length >= 8;
    const tieneMayuscula = /[A-Z]/.test(password);
    const tieneMinuscula = /[a-z]/.test(password);
    const tieneNumero = /[0-9]/.test(password);
    const tieneEspecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
    
    // Actualizar requisitos
    this.seguridadPassword.requisitos = {
      longitud: tieneLongitud,
      mayuscula: tieneMayuscula,
      minuscula: tieneMinuscula,
      numero: tieneNumero,
      especial: tieneEspecial
    };
    
    // Calcular puntaje (0-5)
    let puntaje = 0;
    if (tieneLongitud) puntaje++;
    if (tieneMayuscula) puntaje++;
    if (tieneMinuscula) puntaje++;
    if (tieneNumero) puntaje++;
    if (tieneEspecial) puntaje++;
    
    // Bonus por longitud extra
    if (password.length >= 12) puntaje += 0.5;
    if (password.length >= 16) puntaje += 0.5;
    
    // Determinar nivel y porcentaje
    if (password.length === 0) {
      this.seguridadPassword.nivel = 'muy_debil';
      this.seguridadPassword.texto = 'Muy débil';
      this.seguridadPassword.porcentaje = 0;
    } else if (puntaje <= 1.5) {
      this.seguridadPassword.nivel = 'muy_debil';
      this.seguridadPassword.texto = 'Muy débil';
      this.seguridadPassword.porcentaje = 20;
    } else if (puntaje <= 2.5) {
      this.seguridadPassword.nivel = 'debil';
      this.seguridadPassword.texto = 'Débil';
      this.seguridadPassword.porcentaje = 40;
    } else if (puntaje <= 3.5) {
      this.seguridadPassword.nivel = 'media';
      this.seguridadPassword.texto = 'Aceptable';
      this.seguridadPassword.porcentaje = 60;
    } else if (puntaje <= 4.5) {
      this.seguridadPassword.nivel = 'fuerte';
      this.seguridadPassword.texto = 'Fuerte';
      this.seguridadPassword.porcentaje = 80;
    } else {
      this.seguridadPassword.nivel = 'muy_fuerte';
      this.seguridadPassword.texto = '¡Muy fuerte!';
      this.seguridadPassword.porcentaje = 100;
    }
    
    // Actualizar coincidencia de contraseñas
    this.passwordsCoinciden = password.length > 0 && 
                              password === this.registroForm.confirmarPassword;
  }

  // 🆔 Validación COMPLETA de cédula ecuatoriana
  validarCedula(): void {
    let cedula = this.registroForm.cedula.replace(/\D/g, '');
    this.registroForm.cedula = cedula;
    
    if (cedula.length === 0) {
      this.cedulaError = '';
      this.cedulaValida = false;
      return;
    }
    
    if (cedula.length !== 10) {
      this.cedulaError = cedula.length < 10 
        ? `Faltan ${10 - cedula.length} dígito(s)` 
        : 'La cédula no puede tener más de 10 dígitos';
      this.cedulaValida = false;
      return;
    }
    
    const resultado = this.validarCedulaEcuador(cedula);
    
    if (resultado.valido) {
      this.cedulaError = '';
      this.cedulaValida = true;
    } else {
      this.cedulaError = resultado.mensaje;
      this.cedulaValida = false;
    }
  }

  // 🔍 Algoritmo oficial de validación de cédula ecuatoriana
  private validarCedulaEcuador(cedula: string): { valido: boolean; mensaje: string } {
    if (!/^\d{10}$/.test(cedula)) {
      return { valido: false, mensaje: 'La cédula debe contener solo números' };
    }
    
    const provincia = parseInt(cedula.substring(0, 2), 10);
    const provinciasValidas = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24];
    if (!provinciasValidas.includes(provincia)) {
      return { valido: false, mensaje: `Código de provincia '${cedula.substring(0,2)}' no válido para Ecuador` };
    }
    
    const tercerDigito = parseInt(cedula[2], 10);
    if (tercerDigito < 0 || tercerDigito > 6) {
      if (tercerDigito === 9) {
        return { valido: false, mensaje: 'Cédula de persona jurídica no permitida' };
      }
      return { valido: false, mensaje: 'Tercer dígito de cédula no válido' };
    }
    
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
    
    if (digitoVerificador !== ultimoDigito) {
      return { valido: false, mensaje: 'Cédula inválida: dígito verificador incorrecto' };
    }
    
    return { valido: true, mensaje: '' };
  }

  // 📱 Validar teléfono
  validarTelefono(): void {
    const telefono = this.registroForm.telefono.replace(/\D/g, '');
    this.registroForm.telefono = telefono;
    
    if (telefono.length > 0 && telefono.length !== 10) {
      this.telefonoError = 'El teléfono debe tener 10 dígitos';
    } else {
      this.telefonoError = '';
    }
  }

  //  Validar contraseñas
validarPasswords(): void {
  const password = this.registroForm.password || '';
  const confirmarPassword = this.registroForm.confirmarPassword || '';
  
  // Si ambos tienen valor, comparar
  if (password && confirmarPassword) {
    if (password !== confirmarPassword) {
      this.passwordError = 'Las contraseñas no coinciden';
      this.passwordsCoinciden = false;
    } else {
      this.passwordError = '';
      this.passwordsCoinciden = true;
    }
  } else {
    this.passwordError = '';
    this.passwordsCoinciden = false;
  }
}

  // 🌍 Cargar ubicaciones
  async cargarUbicaciones(): Promise<void> {
    this.isLoadingLocations = true;
    
    this.locationsService.loadLocations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          this.provincias = this.locationsService.getProvincias();
          this.isLoadingLocations = false;
          this.locationsError = !success;
          
          if (!success) {
            this.showToast('⚠️ Algunas ubicaciones podrían no estar disponibles', 'warning');
          }
        },
        error: () => {
          this.isLoadingLocations = false;
          this.locationsError = true;
          this.showToast('Error cargando ubicaciones. Intenta más tarde.', 'danger');
        }
      });
  }

  // 🔄 Cambios en provincia
  onProvinciaChange(provinciaCodigo: string): void {
    this.registroForm.provinciaCodigo = provinciaCodigo;
    this.registroForm.canton = '';
    this.registroForm.cantonCodigo = '';
    this.registroForm.parroquia = '';
    this.registroForm.parroquiaCodigo = '';
    
    const provinciaSeleccionada = this.provincias.find(p => p.codigo === provinciaCodigo);
    if (provinciaSeleccionada) {
      this.registroForm.provincia = provinciaSeleccionada.nombre;
    }
    
    if (provinciaCodigo) {
      this.cantones = this.locationsService.getCantonesByProvincia(provinciaCodigo);
      this.cantones.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else {
      this.cantones = [];
    }
  }

  // 🔄 Cambios en cantón
  onCantonChange(cantonCodigo: string): void {
    this.registroForm.cantonCodigo = cantonCodigo;
    this.registroForm.parroquia = '';
    this.registroForm.parroquiaCodigo = '';
    
    const cantonSeleccionado = this.cantones.find(c => c.codigo === cantonCodigo);
    if (cantonSeleccionado) {
      this.registroForm.canton = cantonSeleccionado.nombre;
    }
    
    if (cantonCodigo && this.registroForm.provinciaCodigo) {
      this.parroquias = this.locationsService.getParroquiasByCanton(
        this.registroForm.provinciaCodigo, 
        cantonCodigo
      );
      this.parroquias.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else {
      this.parroquias = [];
    }
  }

  // 🔄 Cambios en parroquia
  onParroquiaChange(parroquiaCodigo: string): void {
    this.registroForm.parroquiaCodigo = parroquiaCodigo;
    const parroquiaSeleccionada = this.parroquias.find(p => p.codigo === parroquiaCodigo);
    if (parroquiaSeleccionada) {
      this.registroForm.parroquia = parroquiaSeleccionada.nombre;
    }
  }

  customAlertOptions = {
    header: 'Selecciona tu rol',
    subHeader: 'Elige el rol que mejor te describe',
    cssClass: 'alert-rol-custom'
  };

  // 🆕 Cuando cambia el rol
  onRolChange(): void {
    console.log('🔄 Rol seleccionado:', this.registroForm.rol);
    
    if (this.registroForm.rol === 'paciente' && this.registroForm.cedula.length === 10) {
      this.buscarPacienteExistente();
    } else {
      this.pacienteEncontrado = false;
      this.pacienteIdExistente = null;
      this.mensajeAutocompletado = '';
    }
  }

  // ✅ Validar formulario completo
  esFormularioValido(): boolean {
    const f = this.registroForm;
    
    if (!f.nombre || !f.apellido || !f.fechaNacimiento || !f.cedula || 
        !f.genero || !f.telefono || !f.provinciaCodigo || !f.cantonCodigo || 
        !f.correo || !f.password || !f.rol || !f.aceptaTerminos) {
      this.showToast('Por favor complete todos los campos obligatorios (*)', 'danger');
      return false;
    }
    
    if (f.cedula.length !== 10) {
      this.showToast('La cédula debe tener 10 dígitos', 'danger');
      return false;
    }
    
    if (f.telefono.length !== 10) {
      this.showToast('El teléfono debe tener 10 dígitos', 'danger');
      return false;
    }
    
    if (f.password !== f.confirmarPassword) {
      this.showToast('Las contraseñas no coinciden', 'danger');
      return false;
    }
    
    // 🆕 NUEVO: Validar seguridad de contraseña
    if (this.seguridadPassword.nivel === 'muy_debil' || this.seguridadPassword.nivel === 'debil') {
      this.showToast('La contraseña es muy débil. Debe tener al menos 8 caracteres, mayúscula, minúscula, número y símbolo especial.', 'danger');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(f.correo)) {
      this.showToast('Ingrese un correo electrónico válido', 'danger');
      return false;
    }
    
    return true;
  }

  // 🚀 Registrar usuario
  async registrarUsuario(): Promise<void> {
    if (!this.esFormularioValido()) return;

    const loading = await this.loadingCtrl.create({
      message: 'Creando cuenta...',
      spinner: 'crescent',
      cssClass: 'loading-custom'
    });
    await loading.present();

    const datosEnvio: any = {
      nombre: this.registroForm.nombre.trim(),
      apellido: this.registroForm.apellido.trim(),
      fechaNacimiento: this.registroForm.fechaNacimiento,
      edad: this.registroForm.edad,
      cedula: this.registroForm.cedula,
      genero: this.registroForm.genero,
      telefono: this.registroForm.telefono,
      ubicacion: {
        direccion: this.registroForm.direccion?.trim() || null,
        ciudad: this.registroForm.ciudad?.trim() || null,
        provincia: this.registroForm.provincia || null,
        provinciaCodigo: this.registroForm.provinciaCodigo || null,
        canton: this.registroForm.canton || null,
        cantonCodigo: this.registroForm.cantonCodigo || null,
        parroquia: this.registroForm.parroquia || null,
        parroquiaCodigo: this.registroForm.parroquiaCodigo || null
      },
      correo: this.registroForm.correo.toLowerCase().trim(),
      password: this.registroForm.password,
      confirmarPassword: this.registroForm.confirmarPassword,
      rol: this.registroForm.rol,
      aceptaTerminos: this.registroForm.aceptaTerminos,
      fechaRegistro: new Date().toISOString(),
      activo: true
    };

    if (this.registroForm.rol === 'paciente' && this.pacienteIdExistente) {
      datosEnvio.pacienteExistenteId = this.pacienteIdExistente;
      datosEnvio.vincularPaciente = true;
      console.log('🔗 Vinculando paciente existente:', this.pacienteIdExistente);
    }

    console.log('📦 Datos que se enviarán al backend:', JSON.stringify(datosEnvio, null, 2));

    this.generalService.registrarUsuario(datosEnvio).subscribe({
      next: async (response: any) => {
        await loading.dismiss();
        
        const mensaje = this.pacienteEncontrado 
          ? '✅ Cuenta creada y vinculada a su registro existente' 
          : '✅ Cuenta creada exitosamente';
        
        await this.showToast(mensaje, 'success');
        this.redirigirSegunRol(this.registroForm.rol);
        this.limpiarFormulario();
      },
      error: async (error) => {
        await loading.dismiss();
        console.error('❌ Error en registro:', error);
        
        const mensaje = error?.error?.mensaje || error?.message || 'Error al crear la cuenta. Verifique los datos e intente nuevamente.';
        await this.showToast(mensaje, 'danger');
      }
    });
  }

  // 🧭 Redirigir según rol
  redirigirSegunRol(rol: string): void {
    const rolNormalizado = rol?.toLowerCase();
    let ruta = '/login';

    switch (rolNormalizado) {
      case 'doctor':
      case 'nutricionista':
        ruta = '/medico';
        break;
      case 'paciente':
        ruta = '/paciente';
        break;
      case 'enfermera':
        ruta = '/enfermeria';
        break;
      case 'admin':
      case 'administrador':
        ruta = '/administrador';
        break;
      default:
        ruta = '/login';
    }

    console.log(`🔄 Redirigiendo rol "${rolNormalizado}" a: ${ruta}`);
    this.router.navigate([ruta], { replaceUrl: true });
  }

  // 🔄 Ir al login
  irALogin(): void {
    this.router.navigate(['/principal']);
  }

  // 🧹 Limpiar formulario
  limpiarFormulario(): void {
    this.registroForm = {
      nombre: '',
      apellido: '',
      fechaNacimiento: '',
      edad: null,
      cedula: '',
      genero: '',
      telefono: '',
      direccion: '',
      ciudad: '',
      provincia: '',
      provinciaCodigo: '',
      canton: '',
      cantonCodigo: '',
      parroquia: '',
      parroquiaCodigo: '',
      correo: '',
      password: '',
      confirmarPassword: '',
      rol: '',
      aceptaTerminos: false
    };
    this.cedulaError = '';
    this.cedulaValida = false;
    this.telefonoError = '';
    this.passwordError = '';
    this.cantones = [];
    this.parroquias = [];
    
    // 🆕 Resetear seguridad de contraseña
    this.seguridadPassword = {
      nivel: 'muy_debil',
      texto: 'Muy débil',
      porcentaje: 0,
      requisitos: {
        longitud: false,
        mayuscula: false,
        minuscula: false,
        numero: false,
        especial: false
      }
    };
    this.passwordsCoinciden = false;
    
    this.pacienteEncontrado = false;
    this.pacienteIdExistente = null;
    this.mensajeAutocompletado = '';
    this.buscandoPaciente = false;
  }

  // 🔔 Mostrar toast
  async showToast(message: string, color: string = 'primary', duration: number = 3000): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'bottom',
      icon: color === 'success' ? 'checkmark-circle' : color === 'danger' ? 'alert-circle' : 'information-circle',
      cssClass: 'toast-custom'
    });
    toast.present();
  }

  // ⚠️ Mostrar términos y condiciones
  async verTerminos(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Términos y Condiciones',
      subHeader: 'Última actualización: Abril 2026',
      message: `
        <div class="terminos-content">
          <p>Al crear una cuenta en nuestra plataforma de salud, usted acepta:</p>
          <ul>
            <li>Proporcionar información veraz, completa y actualizada</li>
            <li>Responsabilizarse por el uso seguro de su cuenta y contraseña</li>
            <li>Permitir el tratamiento de sus datos personales para fines de atención en salud</li>
            <li>Recibir notificaciones relacionadas con su cuidado médico</li>
            <li>Cumplir con las políticas de privacidad y seguridad de la institución</li>
          </ul>
          <p><strong>Nota:</strong> Sus datos médicos son confidenciales.</p>
        </div>
      `,
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'alert-button-cancel' },
        { 
          text: 'Acepto', 
          cssClass: 'alert-button-accept',
          handler: () => { this.registroForm.aceptaTerminos = true; }
        }
      ],
      cssClass: 'alert-terminos'
    });
    await alert.present();
  }

  // 🆕 Buscar paciente al perder foco en cédula
  async buscarPacienteExistente(): Promise<void> {
    const cedula = this.registroForm.cedula?.trim();
    
    if (cedula?.length !== 10) {
      return;
    }
    
    if (this.pacienteEncontrado && this.registroForm.cedula === cedula) {
      return;
    }
    
    this.buscandoPaciente = true;
    this.pacienteEncontrado = false;
    this.pacienteIdExistente = null;
    this.mensajeAutocompletado = '';
    
    this.generalService.buscarPaciente({ cedula })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (response: any) => {
          this.buscandoPaciente = false;
          
          if (response.error) {
            return;
          }
          
          if (!response.encontrado) {
            this.mensajeAutocompletado = 'ℹ️ No se encontraron registros previos. Complete todos los datos.';
            setTimeout(() => { this.mensajeAutocompletado = ''; }, 3000);
            return;
          }
          
          // 🆕 CASO: Ya tiene cuenta con rol PACIENTE
          if (response.ya_registrado && !response.rol_diferente) {
            const alert = await this.alertCtrl.create({
              header: '⚠️ Cuenta Existente',
              message: `Este paciente ya tiene una cuenta registrada con el correo: <strong>${response.correo}</strong><br><br>¿Desea iniciar sesión?`,
              buttons: [
                { text: 'Cancelar', role: 'cancel' },
                { 
                  text: 'Ir al Login',
                  handler: () => this.router.navigate(['/principal'])
                }
              ]
            });
            await alert.present();
            return;
          }
          
          // 🆕 CASO: Ya tiene cuenta con OTRO ROL
          if (response.ya_registrado && response.rol_diferente) {
            const alert = await this.alertCtrl.create({
              header: '⚠️ Cédula en Uso',
              message: response.mensaje,
              buttons: [
                { text: 'Entendido', role: 'cancel' },
                { 
                  text: 'Ir al Login',
                  handler: () => this.router.navigate(['/principal'])
                }
              ]
            });
            await alert.present();
            return;
          }
          
          // ✅ CASO: Paciente existe sin cuenta → autocompletar
          this.pacienteEncontrado = true;
          this.pacienteIdExistente = response.paciente_id;
          this.mensajeAutocompletado = response.mensaje;
          
          const datos = response.datos;
          
          this.registroForm.nombre = datos.nombre || this.registroForm.nombre;
          this.registroForm.apellido = datos.apellido || this.registroForm.apellido;
          this.registroForm.cedula = datos.cedula || this.registroForm.cedula;
          this.registroForm.telefono = datos.telefono || this.registroForm.telefono;
          this.registroForm.direccion = datos.direccion || this.registroForm.direccion;
          
          if (datos.fechaNacimiento) {
            this.registroForm.fechaNacimiento = datos.fechaNacimiento;
            this.calcularEdad();
          }
          
          if (datos.genero) {
            this.registroForm.genero = datos.genero;
          }
          
          this.validarCedula();
          
          await this.showToast('✅ Datos encontrados. Complete su correo y contraseña.', 'success');
        },
        error: (error) => {
          this.buscandoPaciente = false;
          console.error('❌ Error buscando paciente:', error);
        }
      });
  }

  // 🆕 Buscar por nombre+apellido
  async buscarPorNombre(): Promise<void> {
    const nombre = this.registroForm.nombre?.trim();
    const apellido = this.registroForm.apellido?.trim();
    
    if (!nombre || !apellido) {
      await this.showToast('Ingrese nombre y apellido para buscar', 'warning');
      return;
    }
    
    this.buscandoPaciente = true;
    this.mensajeAutocompletado = '';
    
    this.generalService.buscarPaciente({ nombre, apellido })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (response: any) => {
          this.buscandoPaciente = false;
          
          // 🆕 Ya tiene cuenta con rol paciente
          if (response.encontrado && response.ya_registrado && !response.rol_diferente) {
            const alert = await this.alertCtrl.create({
              header: '⚠️ Cuenta Existente',
              message: `Este paciente ya tiene una cuenta registrada con el correo: <strong>${response.correo}</strong><br><br>¿Desea iniciar sesión?`,
              buttons: [
                { text: 'Cancelar', role: 'cancel' },
                { 
                  text: 'Ir al Login',
                  handler: () => this.router.navigate(['/principal'])
                }
              ]
            });
            await alert.present();
            return;
          }
          
          // 🆕 Ya tiene cuenta con otro rol
          if (response.encontrado && response.ya_registrado && response.rol_diferente) {
            const alert = await this.alertCtrl.create({
              header: '⚠️ Cédula en Uso',
              message: response.mensaje,
              buttons: [
                { text: 'Entendido', role: 'cancel' },
                { 
                  text: 'Ir al Login',
                  handler: () => this.router.navigate(['/principal'])
                }
              ]
            });
            await alert.present();
            return;
          }
          
          // ✅ Paciente existe sin cuenta
          if (response.encontrado && !response.ya_registrado) {
            this.registroForm.cedula = response.datos.cedula;
            this.registroForm.telefono = response.datos.telefono || this.registroForm.telefono;
            this.registroForm.direccion = response.datos.direccion || this.registroForm.direccion;
            
            if (response.datos.fechaNacimiento) {
              this.registroForm.fechaNacimiento = response.datos.fechaNacimiento;
              this.calcularEdad();
            }
            
            if (response.datos.genero) {
              this.registroForm.genero = response.datos.genero;
            }
            
            this.pacienteEncontrado = true;
            this.pacienteIdExistente = response.paciente_id;
            this.mensajeAutocompletado = response.mensaje;
            this.validarCedula();
            
            await this.showToast('✅ Datos encontrados', 'success');
          } else {
            await this.showToast('No se encontraron registros', 'medium');
          }
        },
        error: () => {
          this.buscandoPaciente = false;
        }
      });
  }

  
}