import { Component, OnInit } from '@angular/core';
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

  // 👤 Datos del paciente
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombrePaciente: string = '';
  cedulaPaciente: string = '';

  // 📊 Datos
  datos: any = null;
  cargando = true;

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    this.cargarDatosUsuario();
    await this.cargarDatosAntropometricos();
  }

  private cargarDatosUsuario(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombrePaciente = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Paciente';
        this.cedulaPaciente = user.cedula || 'Sin cédula';
      } catch (e) {
        console.warn('⚠️ Error parseando usuario');
      }
    }
  }

  private async cargarDatosAntropometricos(): Promise<void> {
    this.cargando = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticación');

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/paciente/plan/datos-antropometricos`,
        { headers }
      ).toPromise();

      console.log('📏 [DATOS] Respuesta:', response);

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      this.datos = response.datos;

    } catch (error: any) {
      console.error('❌ Error cargando datos:', error);
      await this.showToast('Error al cargar los datos', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  // 🎯 Clasificación de IMC
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

  // 🎯 Clasificación de peso
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

  // 🎯 Clasificación de cintura
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

  // 🎯 Clasificación de presión arterial
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

  // 🎯 Clasificación de frecuencia cardíaca
  getFrecuenciaLabel(fc: number): string {
    if (fc < 60) return 'Baja (bradicardia)';
    if (fc <= 100) return 'Normal';
    return 'Alta (taquicardia)';
  }

  // 🎯 Clasificación de temperatura
  getTemperaturaLabel(temp: number): string {
    if (temp < 36) return 'Hipotermia';
    if (temp <= 37.5) return 'Normal';
    if (temp <= 38) return 'Febrícula';
    return 'Fiebre';
  }

  // 🎯 Clasificación de SpO2
  getSpo2Class(spo2: number): string {
    if (spo2 >= 95) return 'normal';
    if (spo2 >= 90) return 'bajo';
    return 'critico';
  }

  getSpo2Label(spo2: number): string {
    if (spo2 >= 95) return 'Normal';
    if (spo2 >= 90) return 'Bajo';
    return 'Crítico';
  }

  // 🎯 Clasificación de glucosa
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

  // 💡 Recomendaciones según IMC
  getRecomendaciones(imc: number): string {
    if (imc < 18.5) {
      return `
        <strong>🔵 Bajo peso (IMC: ${imc})</strong><br>
        • Consulta con un nutricionista para aumentar peso de forma saludable<br>
        • Incrementa la ingesta de proteínas y carbohidratos complejos<br>
        • Realiza ejercicios de fuerza para ganar masa muscular<br>
        • Come porciones más frecuentes (5-6 comidas al día)
      `;
    }
    if (imc < 25) {
      return `
        <strong>🟢 Peso normal (IMC: ${imc})</strong><br>
        • ¡Excelente! Mantén tus hábitos saludables<br>
        • Continúa con una dieta balanceada y ejercicio regular<br>
        • Realiza chequeos médicos anuales<br>
        • Mantén una hidratación adecuada (2L de agua al día)
      `;
    }
    if (imc < 30) {
      return `
        <strong>🟡 Sobrepeso (IMC: ${imc})</strong><br>
        • Consulta con un nutricionista para un plan de alimentación<br>
        • Incrementa la actividad física (30 min diarios)<br>
        • Reduce el consumo de azúcares y grasas saturadas<br>
        • Monitorea tu peso semanalmente
      `;
    }
    return `
      <strong>🔴 Obesidad (IMC: ${imc})</strong><br>
      • Consulta médica urgente para evaluar tu estado de salud<br>
      • Sigue un plan nutricional estricto supervisado por profesional<br>
      • Realiza ejercicio físico adaptado a tu condición<br>
      • Monitorea presión arterial y glucosa regularmente<br>
      • Considera apoyo psicológico para cambios de hábitos
    `;
  }

  // 💬 Contactar médico
  async contactarWhatsApp(): Promise<void> {
    const mensaje = `Hola, soy ${this.nombrePaciente}. Me gustaría agendar una evaluación para registrar mis datos antropométricos.`;
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  // 🧭 Navegación
  navegarA(ruta: string): void {
    this.sidebarOpen = false;
    const rutas: Record<string, string> = {
      'pacienteprincipal': '/pacienteprincipal',
      'pacienteverplan': '/pacienteverplan',
      'pacienteplanhistorial': '/pacienteplanhistorial',
      'pacientedatosantropometricos': '/pacientedatosantropometricos',
      'pacienteregistrarglucosa': '/pacienteregistrarglucosa',
      'pacienteregistrarpresion': '/pacienteregistrarpresion',
      'pacientehistorialmedico': '/pacientehistorialmedico',
      'pacientemensajes': '/pacientemensajes',
      'pacienteconfiguracion': '/pacienteconfiguracion'
    };
    const destino = rutas[ruta] || `/${ruta}`;
    this.router.navigate([destino]);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleSubmenu(item: string): void {
    this.submenuAbierto = this.submenuAbierto === item ? null : item;
  }

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