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

  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombrePaciente: string = '';
  cedulaPaciente: string = '';
  pacienteId: string = '';
  medicoId: string = '';
  medicoTelefono: string = '';
  medicoNombre: string = '';
  isMobile = false;

  cargando = true;
  planActivo: boolean = false;
  pesoActual: number | null = null;
  imcActual: number | null = null;
  ultimaGlucosa: number | null = null;
  ultimaPresion: string | null = null;
  ultimoRegistro: any = null;

  proximaCita: any = null;
  diasParaCita: number = 0;

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

  private detectMobile(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    const wasMobile = this.isMobile;
    this.detectMobile();
    if (wasMobile && !this.isMobile && this.sidebarOpen) {
      this.sidebarOpen = false;
      this.submenuAbierto = null;
    }
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

  private async cargarDatosPaciente(): Promise<void> {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombrePaciente = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Paciente';
        this.cedulaPaciente = user.cedula || 'Sin cedula';
        this.pacienteId = user.id || '';
      } catch (e) {
        console.warn('Error parseando usuario');
      }
    }
  }

  private async cargarDatosSalud(): Promise<void> {
    this.cargando = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticacion');

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const [planResp, registroResp] = await Promise.all([
        this.http.get<any>(
          `${environment.apiUrl}/nutricionapp-api/paciente/plan/plan-activo`,
          { headers }
        ).toPromise().catch(() => null),
        this.http.get<any>(
          `${environment.apiUrl}/nutricionapp-api/paciente/plan/ultimo-registro`,
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
      console.error('Error cargando datos de salud:', error);
    } finally {
      this.cargando = false;
    }
  }

  private async cargarProximaCita(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/paciente/plan/proxima-cita`,
        { headers }
      ).toPromise();

      if (resp?.cita) {
        this.proximaCita = resp.cita;
        this.medicoNombre = resp.cita.medico_nombre || 'Tu medico';
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
      console.warn('No se pudo cargar proxima cita');
    }
  }

  private async mostrarAlertaCita(): Promise<void> {
    const mensaje = this.diasParaCita === 0 
      ? 'Tienes una cita HOY!'
      : this.diasParaCita === 1
        ? 'Tienes una cita MANANA!'
        : `Tienes una cita en ${this.diasParaCita} dias`;

    const alert = await this.alertCtrl.create({
      header: 'Recordatorio de Cita',
      message: `${mensaje}<br><br>
        <strong>Fecha:</strong> ${new Date(this.proximaCita.fecha_hora).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}<br>
        <strong>Hora:</strong> ${new Date(this.proximaCita.fecha_hora).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}<br><br>
        Deseas confirmar tu asistencia?`,
      cssClass: 'alert-cita-recordatorio',
      buttons: [
        { 
          text: 'Cancelar cita', 
          role: 'cancel',
          handler: () => this.cancelarCita()
        },
        {
          text: 'Confirmar asistencia',
          handler: () => this.confirmarAsistencia()
        }
      ]
    });
    await alert.present();
  }

  async confirmarAsistencia(): Promise<void> {
    if (!this.proximaCita) return;

    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      await this.http.put(
        `${environment.apiUrl}/nutricionapp-api/paciente/plan/confirmar-cita/${this.proximaCita.id}`,
        {},
        { headers }
      ).toPromise();

      this.proximaCita.estado = 'confirmada';
      await this.mostrarToast('Asistencia confirmada exitosamente', 'success');
      this.contactarWhatsApp('confirmar');

    } catch (error) {
      console.error('Error confirmando asistencia:', error);
      await this.mostrarToast('Error al confirmar asistencia', 'danger');
    }
  }

  async cancelarCita(): Promise<void> {
    if (!this.proximaCita) return;

    const alert = await this.alertCtrl.create({
      header: 'Cancelar Cita',
      message: 'Estas seguro de que deseas cancelar esta cita?',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Si, cancelar',
          handler: async () => {
            try {
              const token = localStorage.getItem('token');
              const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

              await this.http.put(
                `${environment.apiUrl}/nutricionapp-api/paciente/plan/cancelar-cita/${this.proximaCita.id}`,
                {},
                { headers }
              ).toPromise();

              await this.mostrarToast('Cita cancelada', 'warning');
              await this.cargarProximaCita();

            } catch (error) {
              console.error('Error cancelando cita:', error);
              await this.mostrarToast('Error al cancelar cita', 'danger');
            }
          }
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

  async contactarWhatsApp(accion: string = 'general'): Promise<void> {
    if (!this.medicoTelefono) {
      await this.mostrarToast('No hay telefono del medico registrado', 'warning');
      return;
    }

    let telefonoLimpio = this.medicoTelefono.replace(/[\s\-\(\)]/g, '');
    if (telefonoLimpio.startsWith('0')) {
      telefonoLimpio = telefonoLimpio.substring(1);
    }
    if (!telefonoLimpio.startsWith('593')) {
      telefonoLimpio = '593' + telefonoLimpio;
    }

    let mensaje = '';
    
    if (accion === 'confirmar' && this.proximaCita) {
      const fecha = new Date(this.proximaCita.fecha_hora).toLocaleDateString('es-EC', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      });
      const hora = new Date(this.proximaCita.fecha_hora).toLocaleTimeString('es-EC', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      mensaje = `Hola Dr. ${this.medicoNombre}, soy ${this.nombrePaciente}. Le contacto desde la plataforma NutriPa para CONFIRMAR mi asistencia a la cita programada para el ${fecha} a las ${hora}. Gracias!`;
    } else {
      mensaje = `Hola Dr. ${this.medicoNombre}, soy ${this.nombrePaciente}. Le contacto desde la plataforma NutriPa.`;
    }

    const url = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  navegarA(ruta: string): void {
    this.sidebarOpen = false;
    this.submenuAbierto = null;
    this.router.navigate([`/${ruta}`]);
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

  async mostrarToast(message: string, color: 'primary'|'success'|'danger'|'warning' = 'primary'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration: 3000,
      position: 'bottom'
    });
    await toast.present();
  }

  getTipoCitaLabel(tipo: string): string {
    const labels: Record<string, string> = {
      'control': 'Control de rutina',
      'seguimiento': 'Seguimiento de plan',
      'evaluacion': 'Evaluacion inicial',
      'urgencia': 'Urgencia',
      'teleconsulta': 'Teleconsulta'
    };
    return labels[tipo] || tipo;
  }
}