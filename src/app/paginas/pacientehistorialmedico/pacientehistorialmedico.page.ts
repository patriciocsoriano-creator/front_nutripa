import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-pacientehistorialmedico',
  templateUrl: './pacientehistorialmedico.page.html',
  styleUrls: ['./pacientehistorialmedico.page.scss'],
  standalone: false
})
export class PacientehistorialmedicoPage implements OnInit {

  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombrePaciente: string = '';
  cedulaPaciente: string = '';
  isMobile = false;

  historial: any = null;
  cargando = true;
  tabActiva: string = 'evoluciones';

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    this.detectMobile();
    this.cargarDatosUsuario();
    await this.cargarHistorialMedico();
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

  async cargarHistorialMedico(): Promise<void> {
    this.cargando = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticacion');

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/paciente/plan/historial-medico`,
        { headers }
      ).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      this.historial = response.historial || null;

    } catch (error: any) {
      console.error('Error cargando historial medico:', error);
      await this.showToast('Error al cargar el historial medico', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  cambiarTab(): void {
    console.log('Tab activa:', this.tabActiva);
  }

  getAdherenciaColor(adherencia: string): string {
    const colors: Record<string, string> = {
      'excelente': 'success',
      'buena': 'primary',
      'regular': 'warning',
      'baja': 'danger'
    };
    return colors[adherencia] || 'medium';
  }

  esCitaPasada(fechaHora: string): boolean {
    return new Date(fechaHora) < new Date();
  }

  formatearFechaCita(fechaHora: string, parte: string): string {
    const fecha = new Date(fechaHora);
    const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    
    if (parte === 'day') {
      return fecha.getDate().toString().padStart(2, '0');
    }
    if (parte === 'month') {
      return meses[fecha.getMonth()];
    }
    if (parte === 'time') {
      return `${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`;
    }
    return '';
  }

  getTipoCitaColor(tipo: string): string {
    const colors: Record<string, string> = {
      'control': 'primary',
      'seguimiento': 'success',
      'evaluacion': 'tertiary',
      'urgencia': 'danger',
      'teleconsulta': 'warning'
    };
    return colors[tipo] || 'medium';
  }

  getTipoCitaLabel(tipo: string): string {
    const labels: Record<string, string> = {
      'control': 'Control',
      'seguimiento': 'Seguimiento',
      'evaluacion': 'Evaluacion',
      'urgencia': 'Urgencia',
      'teleconsulta': 'Teleconsulta'
    };
    return labels[tipo] || tipo;
  }

  getGlucosaColor(valor: number): string {
    if (!valor) return 'normal';
    if (valor >= 126) return 'alto';
    if (valor >= 100) return 'medio';
    if (valor >= 70) return 'normal';
    return 'bajo';
  }

  getGlucosaEstado(valor: number): string {
    if (!valor) return 'Sin datos';
    if (valor >= 126) return 'Elevada';
    if (valor >= 100) return 'Pre-diabetes';
    if (valor >= 70) return 'Normal';
    return 'Baja';
  }

  getHbA1cColor(valor: number): string {
    if (!valor) return 'normal';
    if (valor >= 6.5) return 'alto';
    if (valor >= 5.7) return 'medio';
    return 'normal';
  }

  getHbA1cEstado(valor: number): string {
    if (!valor) return 'Sin datos';
    if (valor >= 6.5) return 'Diabetes';
    if (valor >= 5.7) return 'Pre-diabetes';
    return 'Normal';
  }

  getEstadoGlucosaColor(valor: number): string {
    if (!valor) return 'medium';
    if (valor >= 126) return 'danger';
    if (valor >= 100) return 'warning';
    if (valor >= 70) return 'success';
    return 'primary';
  }

  getMomentoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    'ayunas': 'En ayunas',
    'postprandial': 'Postprandial',
    'antes_comida': 'Antes de comer',
    'despues_comida': 'Después de comer',
    'antes_dormir': 'Antes de dormir',
    'otro': 'Otro momento'
  };
  return labels[tipo] || tipo;
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
    const mensaje = `Hola, soy ${this.nombrePaciente}. Necesito informacion sobre mi historial medico.`;
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

  async showToast(message: string, color: 'primary'|'success'|'danger'|'warning' = 'primary', duration: number = 3000): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration,
      position: 'bottom'
    });
    await toast.present();
  }
}