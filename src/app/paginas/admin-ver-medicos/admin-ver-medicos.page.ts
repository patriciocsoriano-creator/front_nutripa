import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-ver-medicos',
  templateUrl: './admin-ver-medicos.page.html',
  styleUrls: ['./admin-ver-medicos.page.scss'],
  standalone: false,
})
export class AdminVerMedicosPage implements OnInit {
  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = 'medicos';
  nombreAdmin: string = '';
  rol: string = 'Administrador';
  private isMobile = false;

  // Medicos
  medicos: any[] = [];
  medicosFiltrados: any[] = [];
  cargando = false;
  terminoBusqueda = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private platform: Platform
  ) {
    this.platform.ready().then(() => {
      this.isMobile = this.platform.is('mobile') || this.platform.width() <= 1024;
      if (!this.isMobile) {
        this.sidebarOpen = true;
      }
    });
  }

  ngOnInit() {
    this.cargarDatosAdmin();
    this.cargarMedicos();
  }

  private cargarDatosAdmin() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreAdmin = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Administrador';
        this.rol = user.rol === 'admin' ? 'Administrador General' : 'Administrador';
      } catch (e) {
        console.warn('Error parseando usuario');
      }
    }
  }

  async cargarMedicos() {
    this.cargando = true;
    const token = localStorage.getItem('token');
    
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/medicos`,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      if (response?.error === false) {
        this.medicos = response.medicos || [];
        this.aplicarFiltros();
        console.log('Medicos cargados:', this.medicos.length);
      } else {
        await this.showToast('Error al cargar medicos', 'danger');
      }
    } catch (error) {
      console.error('Error cargando medicos:', error);
      await this.showToast('Error al cargar medicos', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  aplicarFiltros() {
    let filtrados = [...this.medicos];
    
    if (this.terminoBusqueda) {
      const t = this.terminoBusqueda.toLowerCase();
      filtrados = filtrados.filter(m => 
        m.nombre?.toLowerCase().includes(t) ||
        m.apellido?.toLowerCase().includes(t) ||
        m.correo?.toLowerCase().includes(t) ||
        m.cedula?.includes(t)
      );
    }

    this.medicosFiltrados = filtrados;
  }

  async toggleActivo(medico: any) {
    const token = localStorage.getItem('token');
    try {
      await this.http.patch(
        `${environment.apiUrl}/nutricionapp-api/admin/usuarios/${medico.id}/toggle-activo`,
        {},
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();
      await this.showToast(`Medico ${medico.activo ? 'desactivado' : 'activado'}`, 'success');
      this.cargarMedicos();
    } catch (error) {
      await this.showToast('Error al cambiar estado', 'danger');
    }
  }

  getRolLabel(rol: string): string {
    const labels: Record<string, string> = {
      'doctor': 'Medico',
      'nutricionista': 'Nutricionista',
      'enfermera': 'Enfermera'
    };
    return labels[rol] || rol;
  }

  getRolColor(rol: string): string {
    const colores: Record<string, string> = {
      'doctor': 'doctor',
      'nutricionista': 'nutri',
      'enfermera': 'enfermera'
    };
    return colores[rol] || 'default';
  }

  getTitulo(rol: string): string {
    const titulos: Record<string, string> = {
      'doctor': 'Dr(a).',
      'nutricionista': 'Nut.',
      'enfermera': 'Enf.'
    };
    return titulos[rol] || '';
  }

  navegarA(ruta: string): void {
    const rutas: Record<string, string> = {
      'admin-inicio': '/administrador',
      'admin-ver-usuarios': '/admin-ver-usuarios',
      'admin-agregar-usuario': '/admin-agregar-usuario',
      'admin-roles-permisos': '/admin-roles-permisos',
      'admin-ver-medicos': '/admin-ver-medicos',
      'admin-agregar-medico': '/admin-agregar-medico',
      'admin-asignaciones': '/admin-asignaciones',
      'admin-ver-pacientes': '/admin-ver-pacientes',
      'admin-estadisticas-pacientes': '/admin-estadisticas-pacientes',
      'admin-reportes-globales': '/admin-reportes-globales',
      'admin-auditoria': '/admin-auditoria',
      'admin-actividad-usuarios': '/admin-actividad-usuarios',
      'admin-config-general': '/admin-config-general',
      'admin-config-parametros': '/admin-config-parametros',
      'admin-config-backup': '/admin-config-backup'
    };

    const rutaDestino = rutas[ruta] || `/${ruta}`;
    
    if (this.isMobile) {
      this.sidebarOpen = false;
    }
    
    this.router.navigate([rutaDestino]);
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleSubmenu(item: string) {
    this.submenuAbierto = this.submenuAbierto === item ? null : item;
  }

  async cerrarSesion() {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesion',
      message: 'Esta seguro que desea cerrar sesion?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Si, cerrar',
          cssClass: 'alert-button-danger',
          handler: () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            this.router.navigate(['/principal']);
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msg, color, duration: 2500, position: 'bottom' });
    await toast.present();
  }
}