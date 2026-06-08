import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-pacienteplanhistorial',
  templateUrl: './pacienteplanhistorial.page.html',
  styleUrls: ['./pacienteplanhistorial.page.scss'],
  standalone: false,
})
export class PacienteplanhistorialPage implements OnInit {

  // 👤 UI State
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombrePaciente: string = '';
  isMobile = false;

  // 📋 Datos
  planes: any[] = [];
  planesFiltrados: any[] = [];
  cargando = true;

  // 📊 Estadísticas
  planesActivos: number = 0;
  planesCompletados: number = 0;

  // 🔍 Filtros
  filtroEstado: string = 'todos';

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    this.detectMobile();
    this.cargarDatosUsuario();
    await this.cargarHistorial();
  }

  private detectMobile(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.detectMobile();
  }

  private cargarDatosUsuario(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombrePaciente = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Paciente';
      } catch (e) {
        console.warn('⚠️ Error parseando usuario');
      }
    }
  }

  // 📜 Cargar historial de planes
  async cargarHistorial(): Promise<void> {
    this.cargando = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticación');

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/paciente/plan/historial`,
        { headers }
      ).toPromise();

      console.log('📋 Respuesta historial:', response);

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      this.planes = response.planes || [];
      
      // Calcular estadísticas
      this.planesActivos = this.planes.filter(p => p.estado === 'activo').length;
      this.planesCompletados = this.planes.filter(p => p.estado === 'completado').length;

      // Aplicar filtro inicial
      this.aplicarFiltro();

    } catch (error: any) {
      console.error('❌ Error cargando historial:', error);
      await this.showToast('Error al cargar el historial', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  // 🔍 Aplicar filtro de estado
  aplicarFiltro(): void {
    if (this.filtroEstado === 'todos') {
      this.planesFiltrados = [...this.planes];
    } else {
      this.planesFiltrados = this.planes.filter(p => p.estado === this.filtroEstado);
    }
  }

  // 🎨 Color del badge según estado
  getEstadoColor(estado: string): string {
    const colores: Record<string, string> = {
      'activo': 'success',
      'completado': 'primary',
      'cancelado': 'danger',
      'borrador': 'medium'
    };
    return colores[estado] || 'medium';
  }

  // 👁️ Ver detalle del plan
  verDetallePlan(plan: any): void {
    if (plan.estado === 'activo') {
      this.router.navigate(['/pacienteverplan']);
    } else {
      this.showToast(`Plan ${plan.estado} - No se puede ver el detalle`, 'warning');
    }
  }

  // ✅ Plan activo seleccionado
  planActivoSeleccionado(plan: any): void {
    this.router.navigate(['/pacienteverplan']);
  }

  // 💬 Contactar por WhatsApp
  async contactarWhatsApp(): Promise<void> {
    const mensaje = `Hola, soy ${this.nombrePaciente}. Tengo una consulta sobre mis planes nutricionales.`;
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