import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-pacienteregistrarpresion',
  templateUrl: './pacienteregistrarpresion.page.html',
  styleUrls: ['./pacienteregistrarpresion.page.scss'],
  standalone: false
})
export class PacienteregistrarpresionPage implements OnInit {

  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombrePaciente: string = '';
  cedulaPaciente: string = '';
  isMobile = false;

  estadisticas: any = null;
  ultimaMedicion: any = null;

  nuevaMedicion = {
    sistolica: null as number | null,
    diastolica: null as number | null,
    pulso: null as number | null,
    posicion: 'sentado',
    brazo: 'izquierdo',
    fecha_hora: '',
    notas: ''
  };

  

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    this.detectMobile();
    this.cargarDatosUsuario();
    this.inicializarFechaHora();
    
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

  private inicializarFechaHora(): void {
    const ahora = new Date();
    const fecha = ahora.toISOString().slice(0, 16);
    this.nuevaMedicion.fecha_hora = fecha;
  }

  

  async registrarPresion(): Promise<void> {
    if (!this.nuevaMedicion.sistolica || !this.nuevaMedicion.diastolica) {
      await this.showToast('Ingresa los valores de presion sistolica y diastolica', 'danger');
      return;
    }

    if (this.nuevaMedicion.sistolica <= this.nuevaMedicion.diastolica) {
      await this.showToast('La presion sistolica debe ser mayor que la diastolica', 'danger');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });

      const response: any = await this.http.post(
  `${environment.apiUrl}/nutricionapp-api/paciente/glucosa/presion/registrar`,
        {
          sistolica: this.nuevaMedicion.sistolica,
          diastolica: this.nuevaMedicion.diastolica,
          pulso: this.nuevaMedicion.pulso || null,
          posicion: this.nuevaMedicion.posicion,
          brazo: this.nuevaMedicion.brazo,
          fecha_hora: this.nuevaMedicion.fecha_hora || new Date(),
          notas: this.nuevaMedicion.notas || null
        },
        { headers }
      ).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      const color = response.clasificacion === 'normal' ? 'success' : 
                    response.clasificacion === 'elevada' || response.clasificacion === 'alta_etapa1' ? 'warning' : 'danger';
      
      await this.showToast(
        `${response.mensaje_clasificacion || 'Medicion registrada'}`, 
        color, 
        4000
      );

      if (response.clasificacion === 'crisis') {
        const alert = await this.alertCtrl.create({
          header: 'Crisis Hipertensiva',
          message: 'Tu presion arterial esta extremadamente alta. <strong>Busca atencion medica inmediata.</strong><br><br>Si presentas dolor de pecho, dolor de cabeza severo, confusion o dificultad para respirar, llama al 911.',
          buttons: ['Entendido']
        });
        await alert.present();
      }

      this.limpiarFormulario();
      

    } catch (error: any) {
      console.error('Error registrando:', error);
      await this.showToast(error?.message || 'Error al registrar la medicion', 'danger');
    }
  }

  limpiarFormulario(): void {
    this.nuevaMedicion = {
      sistolica: null,
      diastolica: null,
      pulso: null,
      posicion: 'sentado',
      brazo: 'izquierdo',
      fecha_hora: '',
      notas: ''
    };
    this.inicializarFechaHora();
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

    if (sis > 180 || dia > 120) return 'valor-crisis';
    if (sis >= 140 || dia >= 90) return 'valor-alta2';
    if (sis >= 130 || dia >= 80) return 'valor-alta1';
    if (sis >= 120 && dia < 80) return 'valor-elevada';
    return 'valor-normal';
  }

  getPosicionLabel(posicion: string): string {
    const labels: Record<string, string> = {
      'sentado': 'Sentado',
      'acostado': 'Acostado',
      'de_pie': 'De pie'
    };
    return labels[posicion] || posicion;
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