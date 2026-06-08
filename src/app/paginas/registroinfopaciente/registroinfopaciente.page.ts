import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoadingController, ToastController, Platform, AlertController } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { PatientRegistrationService } from 'src/app/services/registro-paciente';

@Component({
  selector: 'app-registroinfopaciente',
  templateUrl: './registroinfopaciente.page.html',
  styleUrls: ['./registroinfopaciente.page.scss'],
  standalone: false,
})
export class RegistroinfopacientePage implements OnInit {

  // 👤 Info de usuario para sidebar
  nombreAsistente: string = '';
  especialidad: string = '';
  
  // 🧭 Sidebar
  sidebarOpen = false;
  private isMobile = false;

  // 📝 Formulario
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

  // 🎂 Edad calculada automáticamente
  edadCalculada: number | null = null;
  
  // 🆕 Estados de carga
  cargandoDatos = true;
  datosPrellenados = false;
  campoBloqueado = false;

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
      if (!this.isMobile) {
        this.sidebarOpen = true;
      }
    });
  }

  async ngOnInit() {
    this.cargarDatosSesion();
    await this.cargarDatosRegistro();
  }
  
  // 👤 Cargar datos de sesión para sidebar
  private cargarDatosSesion(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreAsistente = user.nombre || 'Enfermera';
        this.especialidad = user.rol === 'enfermera' ? 'Asistente Médico' : 
                           user.rol === 'nutricionista' ? 'Nutricionista' : 'Personal Médico';
      } catch (e) {
        console.warn('⚠️ Error parseando sesión:', e);
      }
    }
  }

  // 🆕 CARGAR DATOS DEL REGISTRO Y PACIENTE (SMART LOADING)
  private async cargarDatosRegistro(): Promise<void> {
    this.cargandoDatos = true;
    
    const registroId = this.activatedRoute.snapshot.queryParamMap.get('registro_id') 
                       || localStorage.getItem('registro_clinico_id');
    
    if (!registroId) {
      console.warn('⚠️ No hay registro_id, mostrando formulario vacío');
      this.cargandoDatos = false;
      return;
    }

    localStorage.setItem('registro_clinico_id', registroId);

    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 
        'Authorization': `Bearer ${token}` 
      });

      // 🆕 Consultar estado completo del registro
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/registro/${registroId}/estado`,
        { headers }
      ).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      console.log('📥 [REGISTRO] Datos cargados:', response);

      // 🧭 SMART REDIRECT: Si datos_personales ya está completo, ir al siguiente paso
      if (response.pasosCompletos?.datos_personales) {
        console.log('🧭 [SMART] datos_personales ya completo, redirigiendo a:', response.siguientePaso);
        await this.showToast('Este paso ya fue completado. Redirigiendo...', 'primary');
        
        setTimeout(() => {
          this.router.navigate([`/${response.siguientePaso}`], {
            queryParams: { registro_id: registroId }
          });
        }, 1000);
        return;
      }

      // 📝 PRE-LLENAR: Si datos_personales NO está completo, pre-llenar con datos del paciente
      if (response.paciente) {
        const p = response.paciente;
        
        // Si hay datos básicos del paciente (cedula, nombres), bloquear esos campos
        if (p.numero_identificacion || p.nombres) {
          this.campoBloqueado = true;
          this.datosPrellenados = true;
        }
        
        this.pacienteForm.nombres = p.nombres || '';
        this.pacienteForm.apellidos = p.apellidos || '';
        this.pacienteForm.numeroIdentificacion = p.numero_identificacion || '';
        this.pacienteForm.fechaNacimiento = p.fecha_nacimiento || '';
        this.pacienteForm.sexo = p.sexo || '';
        this.pacienteForm.direccion = p.direccion || '';
        this.pacienteForm.telefono = p.telefono || '';
        this.pacienteForm.ocupacion = p.ocupacion || '';
        this.pacienteForm.actividadFisica = p.actividad_fisica || '';
        
        console.log('✅ [PRE-FILL] Formulario pre-llenado con datos del paciente');
      }

      // Si también hay datos en queryParams (del alert), estos tienen prioridad
      const params = this.activatedRoute.snapshot.queryParamMap;
      if (params.get('nombres')) this.pacienteForm.nombres = params.get('nombres')!;
      if (params.get('apellidos')) this.pacienteForm.apellidos = params.get('apellidos')!;
      if (params.get('numeroIdentificacion')) this.pacienteForm.numeroIdentificacion = params.get('numeroIdentificacion')!;

      // Calcular edad si hay fecha
      if (this.pacienteForm.fechaNacimiento) {
        this.calcularEdad();
      }

    } catch (error: any) {
      console.error('❌ Error cargando datos del registro:', error);
      
      // Si falla la carga, intentar pre-llenar desde queryParams
      this.prellenarDesdeQueryParams();
    } finally {
      this.cargandoDatos = false;
    }
  }

  // 👇 Pre-llenar solo desde queryParams (fallback)
  private prellenarDesdeQueryParams(): void {
    const params = this.activatedRoute.snapshot.queryParamMap;
    const nombres = params.get('nombres');
    const apellidos = params.get('apellidos');
    const cedula = params.get('numeroIdentificacion');
    
    if (nombres || apellidos || cedula) {
      console.log('📥 [FALLBACK] Pre-llenando con queryParams:', { nombres, apellidos, cedula });
      if (nombres) this.pacienteForm.nombres = nombres;
      if (apellidos) this.pacienteForm.apellidos = apellidos;
      if (cedula) this.pacienteForm.numeroIdentificacion = cedula;
    }
  }

  // 🎂 Calcular edad desde fecha de nacimiento
  // 🎂 Calcular edad desde fecha de nacimiento - CORREGIDO
calcularEdad(): void {
  const fecha = this.pacienteForm.fechaNacimiento;
  
  if (!fecha) {
    this.edadCalculada = null;
    return;
  }
  
  // 🆕 VALIDAR FORMATO DE FECHA (YYYY-MM-DD)
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(fecha)) {
    console.log('⚠️ [EDAD] Formato de fecha inválido:', fecha);
    this.edadCalculada = null;
    return;
  }
  
  const nacimiento = new Date(fecha);
  
  // 🆕 VALIDAR QUE LA FECHA SEA VÁLIDA
  if (isNaN(nacimiento.getTime())) {
    console.log('⚠️ [EDAD] Fecha inválida:', fecha);
    this.edadCalculada = null;
    return;
  }
  
  const hoy = new Date();
  
  // Validar que la fecha no sea futura
  if (nacimiento > hoy) {
    console.log('⚠️ [EDAD] Fecha futura:', fecha);
    this.edadCalculada = null;
    return;
  }
  
  // Validar que el año sea razonable (entre 1900 y año actual)
  const anioNacimiento = nacimiento.getFullYear();
  if (anioNacimiento < 1900 || anioNacimiento > hoy.getFullYear()) {
    console.log('⚠️ [EDAD] Año fuera de rango:', anioNacimiento);
    this.edadCalculada = null;
    return;
  }
  
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  
  this.edadCalculada = edad >= 0 && edad <= 120 ? edad : null;
  console.log('🎂 [EDAD] Calculada correctamente:', this.edadCalculada, 'años (fecha:', fecha, ')');
}

  // 🧭 Métodos del Sidebar
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
  
  irAInicio(): void {
    this.router.navigate(['/enfermeria']);
  }

  // 💾 Guardar y continuar
  async guardarYContinuar(): Promise<void> {
    if (!this.pacienteForm.nombres || !this.pacienteForm.apellidos || !this.pacienteForm.numeroIdentificacion) {
      await this.showToast('Complete nombre, apellido y cédula', 'danger');
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

      // Guardar localmente (respaldo offline)
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
      await this.showToast('✅ Datos guardados correctamente', 'success');

    } catch (error: any) {
      await loading.dismiss();
      console.error('❌ Error guardando:', error);
      await this.showToast('⚠️ Datos guardados localmente. Continúe.', 'warning');
      this.navegarSiguientePaso();
    }
  }

  // 🧭 Navegar al siguiente paso
  private navegarSiguientePaso(registroId?: string): void {
    const id = registroId || localStorage.getItem('registro_clinico_id') || '';
    this.router.navigate(['/registroinfosignosvitales'], { 
      queryParams: { registro_id: id } 
    });
  }

  // ❌ Cancelar y volver
  cancelar(): void {
    this.patientService.clearData();
    localStorage.removeItem('registro_clinico_id');
    this.router.navigate(['/enfermeria']);
  }

  // 🔔 Toast notifications
  async showToast(message: string, color: string = 'primary', duration: number = 2500): Promise<void> {
    const toast = await this.toastCtrl.create({ 
      message, 
      duration, 
      color, 
      position: 'bottom',
      icon: color === 'success' ? 'checkmark-circle' : 
            color === 'danger' ? 'alert-circle' : 'information-circle',
      cssClass: 'toast-custom'
    });
    await toast.present();
  }
}