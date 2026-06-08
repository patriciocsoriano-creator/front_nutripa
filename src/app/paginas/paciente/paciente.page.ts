import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-paciente',
  templateUrl: './paciente.page.html',
  styleUrls: ['./paciente.page.scss'],
  standalone: false,
})
export class PacientePage implements OnInit {

  // 👤 Datos del paciente
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombrePaciente: string = '';
  cedulaPaciente: string = '';
  pacienteId: string = '';
  medicoId: string = '';
  medicoTelefono: string = '';
  medicoNombre: string = '';
  isMobile = false;  // 🆕 Detectar móvil

  // 📊 Datos de salud
  cargando = true;
  planActivo: boolean = false;
  pesoActual: number | null = null;
  imcActual: number | null = null;
  ultimaGlucosa: number | null = null;
  ultimaPresion: string | null = null;
  ultimoRegistro: any = null;

  // 📅 Próxima cita
  proximaCita: any = null;
  diasParaCita: number = 0;

  // 💬 Mensajes
  mensajesNoLeidos: number = 0;

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) { }

  async ngOnInit() {
    this.detectMobile();
    await this.cargarDatosPaciente();
    await this.cargarDatosSalud();
    await this.cargarProximaCita();
  }

  // 🆕 Detectar si es móvil
  private detectMobile(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  // 🆕 Listener para detectar cambios de tamaño
  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.detectMobile();
    // Cerrar sidebar si cambia a desktop
    if (!this.isMobile && this.sidebarOpen) {
      this.sidebarOpen = false;
    }
  }

  // 🆕 Toggle sidebar (funciona en móvil y desktop)
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  // 🆕 Cerrar sidebar al hacer clic fuera (solo móvil)
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (this.isMobile && this.sidebarOpen) {
      const target = event.target as HTMLElement;
      const sidebar = document.querySelector('.sidebar');
      const menuIcon = document.querySelector('.menu-icon');
      
      if (sidebar && !sidebar.contains(target) && !menuIcon?.contains(target)) {
        this.sidebarOpen = false;
      }
    }
  }

  // 👤 Cargar datos del paciente
  private async cargarDatosPaciente(): Promise<void> {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombrePaciente = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Paciente';
        this.cedulaPaciente = user.cedula || 'Sin cédula';
        this.pacienteId = user.id || '';
      } catch (e) {
        console.warn('⚠️ Error parseando usuario');
      }
    }
  }

  // 📊 Cargar datos de salud
  private async cargarDatosSalud(): Promise<void> {
    this.cargando = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticación');

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const [planResp, registroResp] = await Promise.all([
        this.http.get<any>(
          `${environment.apiUrl}/nutricionapp-api/paciente/plan-activo`,
          { headers }
        ).toPromise().catch(() => null),
        this.http.get<any>(
          `${environment.apiUrl}/nutricionapp-api/paciente/ultimo-registro`,
          { headers }
        ).toPromise().catch(() => null)
      ]);

      if (planResp?.plan) {
        this.planActivo = true;
      }

      if (registroResp?.registro) {
        this.ultimoRegistro = registroResp.registro;
        
        if (registroResp.registro.datos_antropometricos) {
          const antro = registroResp.registro.datos_antropometricos;
          this.pesoActual = antro.peso || null;
          this.imcActual = antro.imc || null;
        }
        
        if (registroResp.registro.signos_vitales) {
          const signos = registroResp.registro.signos_vitales;
          this.ultimaGlucosa = signos.glucosaAyunas || null;
          this.ultimaPresion = signos.presionArterial || null;
        }
      }

    } catch (error: any) {
      console.error('❌ Error cargando datos de salud:', error);
    } finally {
      this.cargando = false;
    }
  }

  // 📅 Cargar próxima cita
  private async cargarProximaCita(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/paciente/proxima-cita`,
        { headers }
      ).toPromise();

      if (resp?.cita) {
        this.proximaCita = resp.cita;
        this.medicoNombre = resp.cita.medico_nombre || 'Tu médico';
        this.medicoTelefono = resp.cita.medico_telefono || '';
        
        const fechaCita = new Date(this.proximaCita.fecha_hora);
        const hoy = new Date();
        const diffTime = fechaCita.getTime() - hoy.getTime();
        this.diasParaCita = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (this.diasParaCita <= 3 && this.diasParaCita >= 0) {
          this.mostrarAlertaCita();
        }
      }
    } catch (error) {
      console.warn('⚠️ No se pudo cargar próxima cita');
    }
  }

  // 🔔 Mostrar alerta de cita próxima
  private async mostrarAlertaCita(): Promise<void> {
    const mensaje = this.diasParaCita === 0 
      ? '¡Tienes una cita HOY!'
      : this.diasParaCita === 1
        ? '¡Tienes una cita MAÑANA!'
        : `Tienes una cita en ${this.diasParaCita} días`;

    const alert = await this.alertCtrl.create({
      header: '📅 Recordatorio de Cita',
      message: `${mensaje}<br><br>
        <strong>Fecha:</strong> ${new Date(this.proximaCita.fecha_hora).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}<br>
        <strong>Hora:</strong> ${new Date(this.proximaCita.fecha_hora).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}<br><br>
        ¿Deseas confirmar tu asistencia?`,
      buttons: [
        { text: 'Recordar después', role: 'cancel' },
        {
          text: 'Confirmar por WhatsApp',
          handler: () => this.contactarWhatsApp()
        }
      ]
    });
    await alert.present();
  }

  async verProximaCita(): Promise<void> {
    if (this.proximaCita) {
      this.mostrarAlertaCita();
    }
  }

  // 💬 Contactar por WhatsApp
  async contactarWhatsApp(): Promise<void> {
    if (!this.medicoTelefono) {
      await this.mostrarToast('No hay teléfono del médico registrado', 'warning');
      return;
    }

    let telefonoLimpio = this.medicoTelefono.replace(/[\s\-\(\)]/g, '');
    if (telefonoLimpio.startsWith('0')) {
      telefonoLimpio = telefonoLimpio.substring(1);
    }
    if (!telefonoLimpio.startsWith('593')) {
      telefonoLimpio = '593' + telefonoLimpio;
    }

    const mensaje = `Hola Dr. ${this.medicoNombre}, soy ${this.nombrePaciente}. Le contacto desde la plataforma NutriPa.`;
    const url = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  // 🧭 Navegación
  navegarA(ruta: string): void {
    this.sidebarOpen = false;  // 🆕 Cerrar sidebar al navegar
    this.router.navigate([`/${ruta}`]);
  }

  toggleSubmenu(item: string): void {
    this.submenuAbierto = this.submenuAbierto === item ? null : item;
  }

  // 🚪 Cerrar sesión
  async cerrarSesion(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
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

  async mostrarToast(message: string, color: 'primary'|'success'|'danger'|'warning' = 'primary'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration: 3000,
      position: 'bottom'
    });
    await toast.present();
  }
}