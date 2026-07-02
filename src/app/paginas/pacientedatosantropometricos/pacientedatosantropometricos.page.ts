import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-pacientedatosantropometricos',
  templateUrl: './pacientedatosantropometricos.page.html',
  styleUrls: ['./pacientedatosantropometricos.page.scss'],
  standalone: false
})
export class PacientedatosantropometricosPage implements OnInit {

  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombrePaciente: string = '';
  cedulaPaciente: string = '';
  isMobile = false;

  datos: any = null;
  cargando = true;

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    this.detectMobile();
    this.cargarDatosUsuario();
    await this.cargarDatosAntropometricos();
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

  private async cargarDatosAntropometricos(): Promise<void> {
    this.cargando = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticacion');

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/paciente/plan/datos-antropometricos`,
        { headers }
      ).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      this.datos = response.datos;

    } catch (error: any) {
      console.error('Error cargando datos:', error);
      await this.showToast('Error al cargar los datos', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  getIMCClass(imc: number): string {
    if (imc < 18.5) return 'bajo-peso';
    if (imc < 25) return 'normal';
    if (imc < 30) return 'sobrepeso';
    return 'obesidad';
  }

  getIMCLabel(imc: number): string {
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Normal';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidad';
  }

  getPesoStatus(peso: number, talla: number): string {
    if (!peso || !talla) return '';
    const imc = peso / (talla * talla);
    return this.getIMCClass(imc);
  }

  getPesoLabel(peso: number, talla: number): string {
    if (!peso || !talla) return '';
    const imc = peso / (talla * talla);
    return this.getIMCLabel(imc);
  }

  getCinturaStatus(cintura: number): string {
    if (cintura < 94) return 'normal';
    if (cintura < 102) return 'alto';
    return 'muy-alto';
  }

  getCinturaLabel(cintura: number): string {
    if (cintura < 94) return 'Normal';
    if (cintura < 102) return 'Riesgo aumentado';
    return 'Riesgo muy alto';
  }

  getPresionClass(presion: string): string {
    const [sist, dia] = presion.split('/').map(n => parseInt(n.trim()));
    if (sist < 120 && dia < 80) return 'normal';
    if (sist < 140 && dia < 90) return 'elevada';
    if (sist < 180 && dia < 120) return 'alta';
    return 'critica';
  }

  getPresionLabel(presion: string): string {
    const [sist, dia] = presion.split('/').map(n => parseInt(n.trim()));
    if (sist < 120 && dia < 80) return 'Normal';
    if (sist < 140 && dia < 90) return 'Elevada';
    if (sist < 180 && dia < 120) return 'Alta';
    return 'Crisis hipertensiva';
  }

  getFrecuenciaLabel(fc: number): string {
    if (fc < 60) return 'Baja (bradicardia)';
    if (fc <= 100) return 'Normal';
    return 'Alta (taquicardia)';
  }

  getTemperaturaLabel(temp: number): string {
    if (temp < 36) return 'Hipotermia';
    if (temp <= 37.5) return 'Normal';
    if (temp <= 38) return 'Febricula';
    return 'Fiebre';
  }

  getSpo2Class(spo2: number): string {
    if (spo2 >= 95) return 'normal';
    if (spo2 >= 90) return 'bajo';
    return 'critico';
  }

  getSpo2Label(spo2: number): string {
    if (spo2 >= 95) return 'Normal';
    if (spo2 >= 90) return 'Bajo';
    return 'Critico';
  }

  getGlucosaClass(glucosa: number): string {
    if (glucosa < 100) return 'normal';
    if (glucosa < 126) return 'pre-diabetes';
    return 'diabetes';
  }

  getGlucosaLabel(glucosa: number): string {
    if (glucosa < 100) return 'Normal';
    if (glucosa < 126) return 'Pre-diabetes';
    return 'Diabetes';
  }

  getRecomendaciones(imc: number): string {
    if (imc < 18.5) {
      return `
        <strong>Bajo peso (IMC: ${imc})</strong><br>
        • Consulta con un nutricionista para aumentar peso de forma saludable<br>
        • Incrementa la ingesta de proteinas y carbohidratos complejos<br>
        • Realiza ejercicios de fuerza para ganar masa muscular<br>
        • Come porciones mas frecuentes (5-6 comidas al dia)
      `;
    }
    if (imc < 25) {
      return `
        <strong>Peso normal (IMC: ${imc})</strong><br>
        • Excelente! Manten tus habitos saludables<br>
        • Continua con una dieta balanceada y ejercicio regular<br>
        • Realiza chequeos medicos anuales<br>
        • Manten una hidratacion adecuada (2L de agua al dia)
      `;
    }
    if (imc < 30) {
      return `
        <strong>Sobrepeso (IMC: ${imc})</strong><br>
        • Consulta con un nutricionista para un plan de alimentacion<br>
        • Incrementa la actividad fisica (30 min diarios)<br>
        • Reduce el consumo de azucares y grasas saturadas<br>
        • Monitorea tu peso semanalmente
      `;
    }
    return `
      <strong>Obesidad (IMC: ${imc})</strong><br>
      • Consulta medica urgente para evaluar tu estado de salud<br>
      • Sigue un plan nutricional estricto supervisado por profesional<br>
      • Realiza ejercicio fisico adaptado a tu condicion<br>
      • Monitorea presion arterial y glucosa regularmente<br>
      • Considera apoyo psicologico para cambios de habitos
    `;
  }

  async contactarWhatsApp(): Promise<void> {
    const mensaje = `Hola, soy ${this.nombrePaciente}. Me gustaria agendar una evaluacion para registrar mis datos antropometricos.`;
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
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

  async showToast(message: string, color: 'primary'|'success'|'danger'|'warning' = 'primary'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration: 3000,
      position: 'bottom'
    });
    await toast.present();
  }
}