import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-pacienteregistrarglucosa',
  templateUrl: './pacienteregistrarglucosa.page.html',
  styleUrls: ['./pacienteregistrarglucosa.page.scss'],
  standalone: false
})
export class PacienteregistrarglucosaPage implements OnInit {

  // 👤 Datos del paciente
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombrePaciente: string = '';
  cedulaPaciente: string = '';

  // 📊 Estadísticas
  estadisticas: any = null;

  // 🆕 Nueva medición
  nuevaMedicion = {
    valor_glucosa: null as number | null,
    tipo_momento: 'ayunas',
    fecha_hora: '',
    notas: ''
  };

  // 📋 Historial
  mediciones: any[] = [];
  cargandoHistorial = false;
  diasHistorial = 7;
  
  filtrosDias = [
    { dias: 1, label: 'Hoy' },
    { dias: 7, label: '7 días' },
    { dias: 15, label: '15 días' },
    { dias: 30, label: '30 días' }
  ];

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    this.cargarDatosUsuario();
    this.inicializarFechaHora();
    await this.cargarEstadisticas();
    await this.cargarHistorial();
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

  private inicializarFechaHora(): void {
    const ahora = new Date();
    // Formato para input datetime-local: YYYY-MM-DDTHH:mm
    const fecha = ahora.toISOString().slice(0, 16);
    this.nuevaMedicion.fecha_hora = fecha;
  }

  // 📊 Cargar estadísticas
  private async cargarEstadisticas(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/paciente/glucosa/estadisticas`,
        { headers }
      ).toPromise();

      if (response?.error === false) {
        this.estadisticas = response.estadisticas;
      }
    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error);
    }
  }

  // 📋 Cargar historial
  async cargarHistorial(): Promise<void> {
    this.cargandoHistorial = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/paciente/glucosa/historial?dias=${this.diasHistorial}`,
        { headers }
      ).toPromise();

      if (response?.error === false) {
        this.mediciones = response.mediciones || [];
      }
    } catch (error) {
      console.error('❌ Error cargando historial:', error);
    } finally {
      this.cargandoHistorial = false;
    }
  }

  // 🔄 Cambiar filtro de días
  async cambiarFiltroDias(dias: number): Promise<void> {
    this.diasHistorial = dias;
    await this.cargarHistorial();
  }

  // 🩸 Registrar nueva medición
  async registrarGlucosa(): Promise<void> {
    if (!this.nuevaMedicion.valor_glucosa || this.nuevaMedicion.valor_glucosa <= 0) {
      await this.showToast('Ingresa un valor de glucosa válido', 'danger');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });

      const response: any = await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/paciente/glucosa/registrar`,
        {
          valor_glucosa: this.nuevaMedicion.valor_glucosa,
          tipo_momento: this.nuevaMedicion.tipo_momento,
          fecha_hora: this.nuevaMedicion.fecha_hora || new Date(),
          notas: this.nuevaMedicion.notas || null
        },
        { headers }
      ).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      // Mostrar mensaje de clasificación
      const color = response.clasificacion === 'normal' ? 'success' : 
                    response.clasificacion === 'pre-diabetes' ? 'warning' : 'danger';
      
      await this.showToast(
        `✅ ${response.mensaje_clasificacion || 'Medición registrada'}`, 
        color, 
        4000
      );

      // Limpiar formulario y recargar
      this.limpiarFormulario();
      await this.cargarEstadisticas();
      await this.cargarHistorial();

    } catch (error: any) {
      console.error('❌ Error registrando:', error);
      await this.showToast(error?.message || 'Error al registrar la medición', 'danger');
    }
  }

  // 🧹 Limpiar formulario
  limpiarFormulario(): void {
    this.nuevaMedicion = {
      valor_glucosa: null,
      tipo_momento: 'ayunas',
      fecha_hora: '',
      notas: ''
    };
    this.inicializarFechaHora();
  }

  // 🗑️ Eliminar medición
  async eliminarMedicion(medicion: any): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar Medición',
      message: `¿Estás seguro de eliminar la medición de <strong>${medicion.valor_glucosa} mg/dL</strong>?`,
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
              await this.cargarEstadisticas();
              await this.cargarHistorial();
            } catch (error) {
              await this.showToast('Error al eliminar', 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // 🎯 Clasificación de glucosa
  getClasificacion(valor: number, tipoMomento: string): string {
    if (!valor) return '';
    
    if (tipoMomento === 'ayunas') {
      if (valor >= 126) return '⚠️ Elevada';
      if (valor >= 100) return '⚡ Pre-diabetes';
      if (valor >= 70) return '✅ Normal';
      return '⚠️ Baja';
    } else {
      if (valor >= 200) return '⚠️ Elevada';
      if (valor >= 140) return '⚡ Elevada';
      return '✅ Normal';
    }
  }

  getClasificacionColor(valor: number): string {
    if (!valor) return '';
    if (valor >= 126) return 'valor-alto';
    if (valor >= 100) return 'valor-medio';
    if (valor >= 70) return 'valor-normal';
    return 'valor-bajo';
  }

  // 🎯 Icono del momento
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

  // 🎯 Label del momento
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
