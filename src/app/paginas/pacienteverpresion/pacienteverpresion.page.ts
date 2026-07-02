import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-pacienteverpresion',
  templateUrl: './pacienteverpresion.page.html',
  styleUrls: ['./pacienteverpresion.page.scss'],
  standalone: false
})
export class PacienteverpresionPage implements OnInit {

  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombrePaciente: string = '';
  cedulaPaciente: string = '';
  isMobile = false;

  mediciones: any[] = [];
  medicionesFiltradas: any[] = [];
  cargando = true;

  filtroPeriodo: string = 'todos';

  medicionExpandida: string | null = null;

  ultimaMedicion: any = null;
  promedioSistolica: number = 0;
  promedioDiastolica: number = 0;
  minSistolica: number = 0;
  maxSistolica: number = 0;

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    this.detectMobile();
    this.cargarDatosUsuario();
    await this.cargarMediciones();
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

  async cargarMediciones(): Promise<void> {
    this.cargando = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticacion');

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const response: any = await this.http.get(
  `${environment.apiUrl}/nutricionapp-api/paciente/glucosa/presion/historial?dias=365`,
        { headers }
      ).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      this.mediciones = response.mediciones || [];
      this.aplicarFiltro();
      this.calcularEstadisticas();

    } catch (error: any) {
      console.error('Error cargando mediciones:', error);
      await this.showToast('Error al cargar el historial', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  aplicarFiltro(): void {
    if (this.filtroPeriodo === 'todos') {
      this.medicionesFiltradas = [...this.mediciones];
    } else {
      const dias = parseInt(this.filtroPeriodo);
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - dias);
      
      this.medicionesFiltradas = this.mediciones.filter(med => {
        return new Date(med.fecha_hora) >= fechaLimite;
      });
    }
  }

  calcularEstadisticas(): void {
    if (this.mediciones.length === 0) return;

    this.ultimaMedicion = this.mediciones[0];

    const sistolicas = this.mediciones.map(m => parseFloat(m.sistolica));
    const diastolicas = this.mediciones.map(m => parseFloat(m.diastolica));
    
    this.promedioSistolica = sistolicas.reduce((a, b) => a + b, 0) / sistolicas.length;
    this.promedioDiastolica = diastolicas.reduce((a, b) => a + b, 0) / diastolicas.length;
    this.minSistolica = Math.min(...sistolicas);
    this.maxSistolica = Math.max(...sistolicas);
  }

  toggleDetalle(medicionId: string): void {
    this.medicionExpandida = this.medicionExpandida === medicionId ? null : medicionId;
  }

  getClasificacion(sistolica: number, diastolica: number): string {
    if (!sistolica || !diastolica) return '';
    
    const sis = parseInt(String(sistolica));
    const dia = parseInt(String(diastolica));

    if (sis > 180 || dia > 120) return 'Crisis Hipertensiva';
    if (sis >= 140 || dia >= 90) return 'Hipertension Etapa 2';
    if (sis >= 130 || dia >= 80) return 'Hipertension Etapa 1';
    if (sis >= 120 && dia < 80) return 'Presion Elevada';
    return 'Normal';
  }

  getClasificacionColor(sistolica: number, diastolica: number): string {
    if (!sistolica || !diastolica) return '';
    
    const sis = parseInt(String(sistolica));
    const dia = parseInt(String(diastolica));

    if (sis > 180 || dia > 120) return 'nivel-crisis';
    if (sis >= 140 || dia >= 90) return 'nivel-alto2';
    if (sis >= 130 || dia >= 80) return 'nivel-alto1';
    if (sis >= 120 && dia < 80) return 'nivel-elevada';
    return 'nivel-normal';
  }

  getRecomendacion(sistolica: number, diastolica: number): string {
    if (!sistolica || !diastolica) return '';
    
    const sis = parseInt(String(sistolica));
    const dia = parseInt(String(diastolica));

    if (sis > 180 || dia > 120) {
      return 'Busca atencion medica inmediata. Si presentas dolor de pecho, dolor de cabeza severo, confusion o dificultad para respirar, llama al 911.';
    }
    if (sis >= 140 || dia >= 90) {
      return 'Consulta con tu medico. Es posible que necesites medicacion y cambios en el estilo de vida.';
    }
    if (sis >= 130 || dia >= 80) {
      return 'Monitorea regularmente y realiza cambios en el estilo de vida: dieta saludable, ejercicio y reduccion de sal.';
    }
    if (sis >= 120 && dia < 80) {
      return 'Tu presion esta elevada. Mejora tus habitos alimenticios y haz ejercicio regularmente.';
    }
    return 'Excelente! Manten tus habitos saludables: dieta balanceada, ejercicio regular y control del estres.';
  }

  getPosicionLabel(posicion: string): string {
    const labels: Record<string, string> = {
      'sentado': 'Sentado',
      'acostado': 'Acostado',
      'de_pie': 'De pie'
    };
    return labels[posicion] || posicion;
  }

  async eliminarMedicion(medicion: any): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar Medicion',
      message: `Estas seguro de eliminar la medicion de <strong>${medicion.sistolica}/${medicion.diastolica} mmHg</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            try {
              const token = localStorage.getItem('token');
              const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

              await this.http.delete(
  `${environment.apiUrl}/nutricionapp-api/paciente/glucosa/presion/${medicion.id}`,
                { headers }
              ).toPromise();

              await this.showToast('Medicion eliminada', 'success');
              this.medicionExpandida = null;
              await this.cargarMediciones();
            } catch (error) {
              await this.showToast('Error al eliminar', 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
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
    const mensaje = `Hola, soy ${this.nombrePaciente}. Tengo una consulta sobre mi presion arterial.`;
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