import { Component, HostListener, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-medicoseguimientoclinico',
  templateUrl: './medicoseguimientoclinico.page.html',
  styleUrls: ['./medicoseguimientoclinico.page.scss'],
  standalone: false,
})
export class MedicoseguimientoclinicoPage implements OnInit {

  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombreDoctor: string = 'Dr. Usuario';
  especialidad: string = 'Especialista';

  // Estado general
  cargando = true;
  pacienteSeleccionado: any = null;
  planActivo: any = null;
  registroActual: any = null;

  // Tabs
  tabActiva: string = 'evolucion';

  // Formularios
  evolucionForm!: FormGroup;
  citaForm!: FormGroup;
  glucosaForm!: FormGroup;

  // WhatsApp
  mensajeWhatsApp: string = '';

  // Datos
  evoluciones: any[] = [];
  citas: any[] = [];
  historialGlucosa: any[] = [];

  // Estados de carga
  guardando = false;
  guardandoCita = false;
  guardandoGlucosa = false;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private fb: FormBuilder
  ) {}

  async ngOnInit() {
    this.cargarDatosUsuario();
    this.inicializarFormularios();
    
    // Obtener ID del paciente de la URL o del state
    const pacienteId = this.activatedRoute.snapshot.paramMap.get('pacienteId') || 
                       history.state?.pacienteId;
    
    if (pacienteId) {
      await this.cargarDatosPaciente(pacienteId);
    } else {
      this.cargando = false;
    }
  }

  // Cargar datos del usuario
  private cargarDatosUsuario(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreDoctor = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Dr. Usuario';
        this.especialidad = user.rol === 'medico' ? 'Médico Especialista' : 
                           user.rol === 'nutricionista' ? 'Nutricionista' : 'Especialista';
      } catch (e) { 
        console.warn('Error parseando usuario'); 
      }
    }
  }

  // Cargar datos del paciente
  private async cargarDatosPaciente(pacienteId: string): Promise<void> {
    this.cargando = true;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticación');

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      // Cargar datos del paciente
      const pacienteResp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/paciente/${pacienteId}/detalle`,
        { headers }
      ).toPromise();

      if (pacienteResp?.paciente) {
        this.pacienteSeleccionado = pacienteResp.paciente;
        
        // Calcular edad
        if (this.pacienteSeleccionado.fecha_nacimiento) {
          const hoy = new Date();
          const nacimiento = new Date(this.pacienteSeleccionado.fecha_nacimiento);
          this.pacienteSeleccionado.edad = hoy.getFullYear() - nacimiento.getFullYear();
        }

        // Cargar datos relacionados en paralelo
        await Promise.all([
          this.cargarPlanActivo(pacienteId),
          this.cargarRegistroActual(pacienteId),
          this.cargarEvoluciones(pacienteId),
          this.cargarCitas(pacienteId),
          this.cargarHistorialGlucosa(pacienteId)
        ]);
      }
    } catch (error: any) {
      console.error('Error cargando paciente:', error);
      await this.showToast('Error al cargar datos del paciente', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  // Inicializar formularios
  private inicializarFormularios(): void {
    this.evolucionForm = this.fb.group({
      fecha: [new Date().toISOString().split('T')[0], Validators.required],
      objetivos: ['', Validators.required],
      observaciones: [''],
      adherencia: ['buena', Validators.required]
    });

    this.citaForm = this.fb.group({
  fecha: ['', Validators.required],
  hora: ['', Validators.required],
  tipo: ['control', Validators.required],
  motivo: ['']
});

    this.glucosaForm = this.fb.group({
      fecha: [new Date().toISOString().split('T')[0], Validators.required],
      glucosa_ayunas: [null, [Validators.required, Validators.min(40), Validators.max(500)]],
      hba1c: [null, [Validators.min(3), Validators.max(20)]],
      glucosa_postprandial: [null, [Validators.min(50), Validators.max(600)]],
      observaciones: ['']
    });
  }

  // Cargar plan activo
  private async cargarPlanActivo(pacienteId: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
      
      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/plan-nutricional/paciente/${pacienteId}`,
        { headers }
      ).toPromise();

      if (resp?.planes && resp.planes.length > 0) {
        this.planActivo = resp.planes.find((p: any) => p.estado === 'activo') || resp.planes[0];
      }
    } catch (error) {
      console.warn('No se pudo cargar el plan activo');
    }
  }

  // Cargar registro actual
  private async cargarRegistroActual(pacienteId: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
      
      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/paciente/${pacienteId}/registro-actual`,
        { headers }
      ).toPromise();

      if (resp?.registro) {
        this.registroActual = resp.registro;
      }
    } catch (error) {
      console.warn('No se pudo cargar el registro actual');
    }
  }

  // Cargar evoluciones
  private async cargarEvoluciones(pacienteId: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
      
      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/seguimiento/evoluciones/${pacienteId}`,
        { headers }
      ).toPromise();

      this.evoluciones = resp?.evoluciones || [];
    } catch (error) {
      console.warn('No se pudieron cargar las evoluciones');
      this.evoluciones = [];
    }
  }

  // Cargar citas
  private async cargarCitas(pacienteId: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
      
      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/seguimiento/citas/${pacienteId}`,
        { headers }
      ).toPromise();

      this.citas = resp?.citas || [];
    } catch (error) {
      console.warn('No se pudieron cargar las citas');
      this.citas = [];
    }
  }

  // Cargar historial glucosa
  private async cargarHistorialGlucosa(pacienteId: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
      
      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/seguimiento/glucosa/${pacienteId}`,
        { headers }
      ).toPromise();

      this.historialGlucosa = resp?.historial || [];
    } catch (error) {
      console.warn('No se pudo cargar el historial de glucosa');
      this.historialGlucosa = [];
    }
  }

  cambiarTab(): void {
    console.log('Tab activa:', this.tabActiva);
  }

  // Guardar evolución
  async guardarEvolucion(): Promise<void> {
    if (this.evolucionForm.invalid) return;

    this.guardando = true;
    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      const data = {
        paciente_id: this.pacienteSeleccionado.id,
        ...this.evolucionForm.value
      };

      await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/medico/seguimiento/evolucion`,
        data,
        { headers }
      ).toPromise();

      await this.showToast('Evolución registrada correctamente', 'success');
      this.evolucionForm.reset({
        fecha: new Date().toISOString().split('T')[0],
        adherencia: 'buena'
      });
      await this.cargarEvoluciones(this.pacienteSeleccionado.id);
    } catch (error: any) {
      console.error('Error guardando evolución:', error);
      await this.showToast(error?.error?.mensaje || 'Error al guardar evolución', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  // Agendar cita
  async agendarCita(): Promise<void> {
  if (this.citaForm.invalid) return;

  this.guardandoCita = true;
  try {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Formato MySQL: 'YYYY-MM-DD HH:MM:SS' (con espacio, sin T)
    const fecha = this.citaForm.value.fecha; // '2026-07-09'
    const hora = this.citaForm.value.hora;   // '09:30'
    const fechaHora = `${fecha} ${hora}:00`;  // '2026-07-09 09:30:00'

    const data = {
      paciente_id: this.pacienteSeleccionado.id,
      medico_id: user.id || null,
      fecha_hora: fechaHora,  // Solo este campo, no envíes fecha ni hora por separado
      tipo: this.citaForm.value.tipo,
      motivo: this.citaForm.value.motivo
    };

    await this.http.post(
      `${environment.apiUrl}/nutricionapp-api/medico/seguimiento/cita`,
      data,
      { headers }
    ).toPromise();

    await this.showToast('Cita agendada correctamente', 'success');
    this.citaForm.reset({ tipo: 'control' });
    await this.cargarCitas(this.pacienteSeleccionado.id);
  } catch (error: any) {
    console.error('Error agendando cita:', error);
    await this.showToast(error?.error?.mensaje || 'Error al agendar cita', 'danger');
  } finally {
    this.guardandoCita = false;
  }
}

  // Registrar glucosa
  async registrarGlucosa(): Promise<void> {
    if (this.glucosaForm.invalid) return;

    this.guardandoGlucosa = true;
    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      const data = {
        paciente_id: this.pacienteSeleccionado.id,
        ...this.glucosaForm.value
      };

      await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/medico/seguimiento/glucosa`,
        data,
        { headers }
      ).toPromise();

      await this.showToast('Medición registrada correctamente', 'success');
      this.glucosaForm.reset({
        fecha: new Date().toISOString().split('T')[0]
      });
      await this.cargarHistorialGlucosa(this.pacienteSeleccionado.id);
    } catch (error: any) {
      console.error('Error registrando glucosa:', error);
      await this.showToast(error?.error?.mensaje || 'Error al registrar medición', 'danger');
    } finally {
      this.guardandoGlucosa = false;
    }
  }

  formatearFechaCita(fechaStr: string, tipo: 'day' | 'month' | 'time'): string {
  if (!fechaStr) return '';
  
  const fecha = new Date(fechaStr);
  
  // Ajustar a zona horaria de Ecuador (UTC-5)
  const offset = -5 * 60; // minutos
  const localTime = new Date(fecha.getTime() + (offset + fecha.getTimezoneOffset()) * 60000);
  
  if (tipo === 'day') {
    return localTime.getDate().toString().padStart(2, '0');
  } else if (tipo === 'month') {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return meses[localTime.getMonth()];
  } else if (tipo === 'time') {
    const horas = localTime.getHours().toString().padStart(2, '0');
    const minutos = localTime.getMinutes().toString().padStart(2, '0');
    return `${horas}:${minutos}`;
  }
  
  return '';
}

  // WhatsApp
  contactarWhatsApp(): void {
    if (!this.pacienteSeleccionado?.telefono) {
      this.showToast('El paciente no tiene número de teléfono registrado', 'warning');
      return;
    }

    let telefonoLimpio = this.pacienteSeleccionado.telefono.replace(/[\s\-\(\)]/g, '');
    if (telefonoLimpio.startsWith('0')) {
      telefonoLimpio = telefonoLimpio.substring(1);
    }
    if (!telefonoLimpio.startsWith('593')) {
      telefonoLimpio = '593' + telefonoLimpio;
    }

    const nombrePaciente = `${this.pacienteSeleccionado.nombres} ${this.pacienteSeleccionado.apellidos}`;
    const mensaje = this.mensajeWhatsApp || 
      `Hola ${nombrePaciente}, soy el Dr. ${this.nombreDoctor}. Te contacto desde la plataforma NutriPa para dar seguimiento a tu plan nutricional. ¿En qué puedo ayudarte?`;
    
    const url = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
    
    this.showToast(`Abriendo WhatsApp con ${nombrePaciente}...`, 'success', 2000);
  }

  // Recordar cita por WhatsApp
  recordarCitaWhatsApp(cita: any): void {
    const fecha = new Date(cita.fecha_hora);
    const opciones: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    const fechaFormateada = fecha.toLocaleString('es-EC', opciones);
    
    const nombrePaciente = `${this.pacienteSeleccionado.nombres} ${this.pacienteSeleccionado.apellidos}`;
    const mensaje = `Hola ${nombrePaciente}, te recuerdo que tienes una cita programada para el ${fechaFormateada} (${this.getTipoCitaLabel(cita.tipo)}). ${cita.motivo ? 'Motivo: ' + cita.motivo : ''} ¡Te espero!`;
    
    this.mensajeWhatsApp = mensaje;
    this.contactarWhatsApp();
  }

  // Mensajes rápidos
  setMensajeRapido(tipo: string): void {
    const nombrePaciente = `${this.pacienteSeleccionado.nombres} ${this.pacienteSeleccionado.apellidos}`;
    
    const mensajes: Record<string, string> = {
      recordatorio: `Hola ${nombrePaciente}, te recuerdo que tienes una cita próximamente. Por favor confírmame tu asistencia.`,
      seguimiento: `Hola ${nombrePaciente}, ¿cómo ha ido con tu plan nutricional? ¿Tienes alguna duda o inquietud que quieras comentar?`,
      glucosa: `Hola ${nombrePaciente}, ¿podrías compartirme tus últimos valores de glucosa en ayunas? Necesito monitorear tu evolución.`,
      saludo: `Hola ${nombrePaciente}, espero que estés muy bien. Te contacto para saber cómo te has sentido y cómo va tu alimentación.`
    };
    
    this.mensajeWhatsApp = mensajes[tipo] || '';
  }

  // Helpers de UI
  getAdherenciaColor(adherencia: string): string {
    const colores: Record<string, string> = {
      'excelente': 'success',
      'buena': 'primary',
      'regular': 'warning',
      'baja': 'danger'
    };
    return colores[adherencia] || 'medium';
  }

  getTipoCitaColor(tipo: string): string {
    const colores: Record<string, string> = {
      'control': 'primary',
      'seguimiento': 'success',
      'evaluacion': 'tertiary',
      'urgencia': 'danger',
      'teleconsulta': 'secondary'
    };
    return colores[tipo] || 'medium';
  }

  getTipoCitaLabel(tipo: string): string {
    const labels: Record<string, string> = {
      'control': 'Control',
      'seguimiento': 'Seguimiento',
      'evaluacion': 'Evaluación',
      'urgencia': 'Urgencia',
      'teleconsulta': 'Teleconsulta'
    };
    return labels[tipo] || tipo;
  }

  esCitaPasada(fecha: string): boolean {
    return new Date(fecha) < new Date();
  }

  // Cancelar cita
  async cancelarCita(cita: any): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cancelar Cita',
      message: '¿Estás seguro de cancelar esta cita?',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí, cancelar',
          handler: async () => {
            try {
              const token = localStorage.getItem('token');
              const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
              
              await this.http.delete(
                `${environment.apiUrl}/nutricionapp-api/medico/seguimiento/cita/${cita.id}`,
                { headers }
              ).toPromise();

              await this.showToast('Cita cancelada', 'success');
              await this.cargarCitas(this.pacienteSeleccionado.id);
            } catch (error) {
              await this.showToast('Error al cancelar cita', 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // Colores glucosa
  getGlucosaColor(valor: number): string {
    if (!valor) return 'normal';
    if (valor < 100) return 'normal';
    if (valor < 126) return 'pre-diabetes';
    return 'diabetes';
  }

  getHbA1cColor(valor: number): string {
    if (!valor) return 'normal';
    if (valor < 5.7) return 'normal';
    if (valor < 6.5) return 'pre-diabetes';
    return 'diabetes';
  }

  getGlucosaEstado(valor: number): string {
    if (!valor) return 'Sin datos';
    if (valor < 100) return 'Normal';
    if (valor < 126) return 'Pre-diabetes';
    return 'Diabetes';
  }

  getHbA1cEstado(valor: number): string {
    if (!valor) return 'Sin datos';
    if (valor < 5.7) return 'Normal';
    if (valor < 6.5) return 'Pre-diabetes';
    return 'Diabetes';
  }

  getEstadoGlucosaColor(valor: number): string {
    if (!valor) return 'medium';
    if (valor < 100) return 'success';
    if (valor < 126) return 'warning';
    return 'danger';
  }

  // Ver plan activo
  verPlanActivo(): void {
    if (this.planActivo) {
      this.router.navigate(['/medicoplanesnutricionalescreadosver', this.planActivo.id]);
    } else {
      this.showToast('No hay plan activo para este paciente', 'warning');
    }
  }

  // Crear nuevo plan
  crearNuevoPlan(): void {
    this.router.navigate(['/medicocrearplan'], {
      state: { pacienteId: this.pacienteSeleccionado.id }
    });
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
      'medicoinformes': '/medicoinformes',
      'medico-configuracion': '/medico-configuracion'
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

  // Refrescar datos
  async refrescarDatos(): Promise<void> {
    if (this.pacienteSeleccionado) {
      await this.cargarDatosPaciente(this.pacienteSeleccionado.id);
      await this.showToast('Datos actualizados', 'success');
    }
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