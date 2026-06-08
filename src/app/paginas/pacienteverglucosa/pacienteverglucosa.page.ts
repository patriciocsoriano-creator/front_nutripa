import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-pacienteverglucosa',
  templateUrl: './pacienteverglucosa.page.html',
  styleUrls: ['./pacienteverglucosa.page.scss'],
  standalone: false
})
export class PacienteverglucosaPage implements OnInit {

  // 👤 Datos del paciente
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombrePaciente: string = '';
  cedulaPaciente: string = '';

  // 📊 Mediciones
  mediciones: any[] = [];
  medicionesFiltradas: any[] = [];
  cargando = true;

  // 🎛️ Filtros
  filtroPeriodo: string = 'todos';

  // 🔄 Control de expansión
  medicionExpandida: string | null = null;

  // 📊 Estadísticas
  ultimaMedicion: any = null;
  promedioGlucosa: number = 0;
  minGlucosa: number = 0;
  maxGlucosa: number = 0;

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    this.cargarDatosUsuario();
    await this.cargarMediciones();
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

  async cargarMediciones(): Promise<void> {
    this.cargando = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticación');

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/paciente/glucosa/historial?dias=365`,
        { headers }
      ).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      this.mediciones = response.mediciones || [];
      this.aplicarFiltro();
      this.calcularEstadisticas();

    } catch (error: any) {
      console.error('❌ Error cargando mediciones:', error);
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

    // Última medición
    this.ultimaMedicion = this.mediciones[0];

    // Promedio, min, max
    const valores = this.mediciones.map(m => m.valor_glucosa);
    this.promedioGlucosa = valores.reduce((a, b) => a + b, 0) / valores.length;
    this.minGlucosa = Math.min(...valores);
    this.maxGlucosa = Math.max(...valores);
  }

  toggleDetalle(medicionId: string): void {
    this.medicionExpandida = this.medicionExpandida === medicionId ? null : medicionId;
  }

  getClasificacion(valor: number, tipoMomento: string): string {
    if (!valor) return '';
    
    if (tipoMomento === 'ayunas') {
      if (valor >= 126) return 'Elevada';
      if (valor >= 100) return 'Pre-diabetes';
      if (valor >= 70) return 'Normal';
      return 'Baja';
    } else {
      if (valor >= 200) return 'Elevada';
      if (valor >= 140) return 'Elevada';
      return 'Normal';
    }
  }

  getClasificacionColor(valor: number): string {
    if (!valor) return '';
    if (valor >= 126) return 'valor-alto';
    if (valor >= 100) return 'valor-medio';
    if (valor >= 70) return 'valor-normal';
    return 'valor-bajo';
  }

  getMomentoIcono(tipo: string): string {
    const iconos: Record<string, string> = {
      'ayunas': 'sunny-outline',
      'antes_comida': 'restaurant-outline',
      'despues_comida': 'restaurant-outline',
      'postprandial': 'restaurant-outline',
      'antes_dormir': 'moon-outline',
      'otro': 'time-outline'
    };
    return iconos[tipo] || 'time-outline';
  }

  getMomentoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      'ayunas': 'En ayunas',
      'antes_comida': 'Antes de comer',
      'despues_comida': 'Después de comer',
      'postprandial': 'Postprandial',
      'antes_dormir': 'Antes de dormir',
      'otro': 'Otro momento'
    };
    return labels[tipo] || tipo;
  }

  getRecomendacion(valor: number, tipoMomento: string): string {
    if (valor >= 126 || (tipoMomento !== 'ayunas' && valor >= 200)) {
      return 'Tu nivel de glucosa está elevado. Consulta con tu médico y revisa tu alimentación. Mantén un registro detallado de tus comidas.';
    }
    if (valor >= 100) {
      return 'Tu nivel está en el rango de pre-diabetes. Mantén una dieta balanceada, haz ejercicio regularmente y monitorea tu glucosa frecuentemente.';
    }
    if (valor >= 70) {
      return '¡Excelente! Tu nivel de glucosa está en rango normal. Continúa con tus hábitos saludables.';
    }
    return 'Tu nivel de glucosa está bajo. Consume algo con carbohidratos de absorción rápida (jugo, fruta) y consulta con tu médico si persiste.';
  }

  async eliminarMedicion(medicion: any): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar Medición',
      message: `¿Estás seguro de eliminar la medición de <strong>${medicion.valor_glucosa} mg/dL</strong> del ${new Date(medicion.fecha_hora).toLocaleDateString()}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            try {
              const token = localStorage.getItem('token');
              const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

              await this.http.delete(
                `${environment.apiUrl}/nutricionapp-api/paciente/glucosa/${medicion.id}`,
                { headers }
              ).toPromise();

              await this.showToast('Medición eliminada', 'success');
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

  // 🧭 Navegación
  navegarA(ruta: string): void {
    this.sidebarOpen = false;
    const rutas: Record<string, string> = {
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
  }

  toggleSubmenu(item: string): void {
    this.submenuAbierto = this.submenuAbierto === item ? null : item;
  }

  async contactarWhatsApp(): Promise<void> {
    const mensaje = `Hola, soy ${this.nombrePaciente}. Tengo una consulta sobre mis niveles de glucosa.`;
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
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