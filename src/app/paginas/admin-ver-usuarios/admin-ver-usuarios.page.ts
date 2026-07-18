import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-ver-usuarios',
  templateUrl: './admin-ver-usuarios.page.html',
  styleUrls: ['./admin-ver-usuarios.page.scss'],
  standalone: false,
})
export class AdminVerUsuariosPage implements OnInit {
  //  Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombreAdmin: string = '';
  rol: string = 'Administrador';
  private isMobile = false;

  //  Usuarios
  usuarios: any[] = [];
  usuariosFiltrados: any[] = [];
  cargando = false;
  terminoBusqueda = '';
  filtroRol = 'todos';

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
    this.cargarUsuarios();
  }

  //  Cargar datos del admin
  private cargarDatosAdmin() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreAdmin = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Administrador';
        this.rol = user.rol === 'admin' ? 'Administrador General' : 'Administrador';
      } catch (e) {
        console.warn(' Error parseando usuario');
      }
    }
  }

  //  Cargar usuarios desde backend
  async cargarUsuarios() {
    this.cargando = true;
    const token = localStorage.getItem('token');
    
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/usuarios`,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      if (response?.error === false) {
        this.usuarios = response.usuarios || [];
        this.aplicarFiltros();
        console.log(' Usuarios cargados:', this.usuarios.length);
      } else {
        await this.showToast('Error al cargar usuarios', 'danger');
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      await this.showToast('Error al cargar usuarios', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  //  Aplicar filtros
  aplicarFiltros() {
    let filtrados = [...this.usuarios];
    
    if (this.terminoBusqueda) {
      const t = this.terminoBusqueda.toLowerCase();
      filtrados = filtrados.filter(u => 
        u.nombre?.toLowerCase().includes(t) ||
        u.apellido?.toLowerCase().includes(t) ||
        u.correo?.toLowerCase().includes(t) ||
        u.cedula?.includes(t)
      );
    }

    if (this.filtroRol !== 'todos') {
      filtrados = filtrados.filter(u => u.rol === this.filtroRol);
    }

    this.usuariosFiltrados = filtrados;
  }

  //  Eliminar usuario
  async eliminarUsuario(usuario: any) {
    const alert = await this.alertCtrl.create({
      header: ' Eliminar Usuario',
      message: `¿Eliminar a <strong>${usuario.nombre} ${usuario.apellido}</strong>?<br><br>Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          cssClass: 'alert-button-danger',
          handler: async () => {
            const token = localStorage.getItem('token');
            try {
              await this.http.delete(
                `${environment.apiUrl}/nutricionapp-api/admin/usuarios/${usuario.id}`,
                { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
              ).toPromise();
              await this.showToast(' Usuario eliminado', 'success');
              this.cargarUsuarios();
            } catch (error) {
              await this.showToast(' Error al eliminar', 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  //  Toggle activo/inactivo
  async toggleActivo(usuario: any) {
    const token = localStorage.getItem('token');
    try {
      await this.http.patch(
        `${environment.apiUrl}/nutricionapp-api/admin/usuarios/${usuario.id}/toggle-activo`,
        {},
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();
      await this.showToast(`Usuario ${usuario.activo ? 'desactivado' : 'activado'}`, 'success');
      this.cargarUsuarios();
    } catch (error) {
      await this.showToast('Error al cambiar estado', 'danger');
    }
  }

  //  Helpers visuales
  getRolLabel(rol: string): string {
    const labels: Record<string, string> = {
      'admin': 'Administrador',
      'doctor': 'Médico',
      'nutricionista': 'Nutricionista',
      'enfermera': 'Enfermera',
      'paciente': 'Paciente'
    };
    return labels[rol] || rol;
  }

  getRolColor(rol: string): string {
    const colores: Record<string, string> = {
      'admin': 'admin',
      'doctor': 'doctor',
      'nutricionista': 'nutri',
      'enfermera': 'enfermera',
      'paciente': 'paciente'
    };
    return colores[rol] || 'default';
  }

  //  Navegación
  navegarA(ruta: string): void {
    const rutas: Record<string, string> = {
      'admin-inicio': '/administrador',
      'admin-ver-usuarios': '/admin-ver-usuarios',
      'admin-agregar-usuario': '/admin-ver-usuarios',
      'admin-roles-permisos': '/admin-ver-usuarios',
      'admin-ver-medicos': '/admin-ver-medicos',
      'admin-agregar-medico': '/admin-agregar-medico',
      'admin-asignaciones': '/admin-asignaciones',
      'admin-ver-pacientes': '/admin-ver-pacientes',
      'admin-estadisticas-pacientes': '/admin-estadisticas-pacientes',
      'admin-reportes-globales': '/admin-reportes-globales',
      'admin-auditoria': '/admin-auditoria',
      'admin-actividad-usuarios': '/admin-auditoria',
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
      header: 'Cerrar sesión',
      message: '¿Estás seguro que deseas cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, cerrar',
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