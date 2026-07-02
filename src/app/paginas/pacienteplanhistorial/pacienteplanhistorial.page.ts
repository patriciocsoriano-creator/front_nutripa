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

  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombrePaciente: string = '';
  isMobile = false;

  planes: any[] = [];
  planesFiltrados: any[] = [];
  cargando = true;
  filtroEstado: string = 'todos';
  planesActivos: number = 0;
  planesCompletados: number = 0;

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
      } catch (e) {
        console.warn('Error parseando usuario');
      }
    }
  }

  async cargarHistorial(): Promise<void> {
    this.cargando = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticacion');

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/paciente/plan/historial`,
        { headers }
      ).toPromise();

      if (resp?.planes) {
        this.planes = resp.planes;
        this.calcularEstadisticas();
        this.aplicarFiltro();
      }
    } catch (error: any) {
      console.error('Error cargando historial:', error);
      await this.mostrarToast('Error al cargar el historial', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  private calcularEstadisticas(): void {
    this.planesActivos = this.planes.filter(p => p.estado === 'activo').length;
    this.planesCompletados = this.planes.filter(p => p.estado === 'completado').length;
  }

  aplicarFiltro(): void {
    if (this.filtroEstado === 'todos') {
      this.planesFiltrados = [...this.planes];
    } else {
      this.planesFiltrados = this.planes.filter(p => p.estado === this.filtroEstado);
    }
  }

  getEstadoColor(estado: string): string {
    const colors: Record<string, string> = {
      activo: 'success',
      completado: 'primary',
      cancelado: 'danger',
      pendiente: 'warning'
    };
    return colors[estado] || 'medium';
  }

  verDetallePlan(plan: any): void {
    console.log('Ver detalle del plan:', plan);
  }

  planActivoSeleccionado(plan: any): void {
    console.log('Plan activo seleccionado:', plan);
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
      'pacienteregistrarpresion': '/pacienteregistrarpresion',
      'pacientehistorialmedico': '/pacientehistorialmedico',
      'pacientemensajes': '/pacientemensajes',
      'pacienteconfiguracion': '/pacienteconfiguracion'
    };
    const destino = rutas[ruta] || `/${ruta}`;
    this.router.navigate([destino]);
  }

  async contactarWhatsApp(): Promise<void> {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;

    try {
      const user = JSON.parse(userStr);
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/paciente/plan/plan-activo`,
        { headers }
      ).toPromise();

      if (resp?.plan?.medico_telefono) {
        let telefonoLimpio = resp.plan.medico_telefono.replace(/[\s\-\(\)]/g, '');
        if (telefonoLimpio.startsWith('0')) {
          telefonoLimpio = telefonoLimpio.substring(1);
        }
        if (!telefonoLimpio.startsWith('593')) {
          telefonoLimpio = '593' + telefonoLimpio;
        }

        const mensaje = `Hola Dr. ${resp.plan.medico_nombre}, soy ${this.nombrePaciente}. Le contacto desde la plataforma NutriPa.`;
        const url = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
      } else {
        await this.mostrarToast('No hay telefono del medico registrado', 'warning');
      }
    } catch (error) {
      await this.mostrarToast('Error al contactar al medico', 'danger');
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