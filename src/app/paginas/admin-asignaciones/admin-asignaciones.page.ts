import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoadingController, ToastController, AlertController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-asignaciones',
  templateUrl: './admin-asignaciones.page.html',
  styleUrls: ['./admin-asignaciones.page.scss'],
  standalone: false,
})
export class AdminAsignacionesPage implements OnInit {
  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = 'medicos';
  nombreAdmin: string = '';
  rol: string = 'Administrador';
  private isMobile = false;

  // Datos
  medicos: any[] = [];
  pacientes: any[] = [];
  asignaciones: any[] = [];
  cargando = false;
  guardando = false;
  
  nuevaAsignacion = {
    medico_id: '',
    paciente_id: ''
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
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
    this.cargarDatos();
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

  async cargarDatos() {
    this.cargando = true;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    try {
      const [medicosRes, pacientesRes, asigRes]: any[] = await Promise.all([
        this.http.get(`${environment.apiUrl}/nutricionapp-api/admin/medicos`, { headers }).toPromise(),
        this.http.get(`${environment.apiUrl}/nutricionapp-api/admin/pacientes`, { headers }).toPromise(),
        this.http.get(`${environment.apiUrl}/nutricionapp-api/admin/asignaciones`, { headers }).toPromise()
      ]);

      this.medicos = medicosRes?.medicos || [];
      this.pacientes = pacientesRes?.pacientes || [];
      this.asignaciones = asigRes?.asignaciones || [];
      
      console.log('Datos cargados:', {
        medicos: this.medicos.length,
        pacientes: this.pacientes.length,
        asignaciones: this.asignaciones.length
      });
    } catch (error) {
      console.error('Error cargando datos:', error);
      await this.showToast('Error al cargar datos', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  existeAsignacion(): boolean {
    if (!this.nuevaAsignacion.medico_id || !this.nuevaAsignacion.paciente_id) {
      return false;
    }
    return this.asignaciones.some(a => 
      a.medico_id === this.nuevaAsignacion.medico_id && 
      a.paciente_id === this.nuevaAsignacion.paciente_id
    );
  }

  async crearAsignacion() {
    if (!this.nuevaAsignacion.medico_id || !this.nuevaAsignacion.paciente_id) {
      await this.showToast('Seleccione medico y paciente', 'warning');
      return;
    }

    if (this.existeAsignacion()) {
      await this.showToast('Esta asignacion ya existe', 'warning');
      return;
    }

    this.guardando = true;
    const token = localStorage.getItem('token');
    
    try {
      await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/admin/asignaciones`,
        this.nuevaAsignacion,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      await this.showToast('Asignacion creada exitosamente', 'success');
      this.nuevaAsignacion = { medico_id: '', paciente_id: '' };
      this.cargarDatos();
    } catch (error: any) {
      console.error('Error creando asignacion:', error);
      await this.showToast(error?.error?.mensaje || 'Error al asignar', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  async eliminarAsignacion(asig: any) {
    const medicoNombre = this.getMedicoNombre(asig.medico_id);
    const pacienteNombre = this.getPacienteNombre(asig.paciente_id);

    const alert = await this.alertCtrl.create({
      header: 'Eliminar Asignacion',
      message: `Desea eliminar la asignacion entre <strong>${medicoNombre}</strong> y <strong>${pacienteNombre}</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          cssClass: 'alert-button-danger',
          handler: async () => {
            const token = localStorage.getItem('token');
            try {
              await this.http.delete(
                `${environment.apiUrl}/nutricionapp-api/admin/asignaciones/${asig.id}`,
                { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
              ).toPromise();
              await this.showToast('Asignacion eliminada', 'success');
              this.cargarDatos();
            } catch (error) {
              await this.showToast('Error al eliminar', 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // Helpers para mostrar nombres
  getMedicoNombre(id: string): string {
    const m = this.medicos.find(m => m.id === id);
    return m ? `${m.nombre} ${m.apellido}` : 'Desconocido';
  }

  getMedicoRol(id: string): string {
    const m = this.medicos.find(m => m.id === id);
    return m?.rol || 'doctor';
  }

  getMedicoInicial(id: string): string {
    const m = this.medicos.find(m => m.id === id);
    return m ? `${m.nombre?.charAt(0)}${m.apellido?.charAt(0)}` : '?';
  }

  getPacienteNombre(id: string): string {
    const p = this.pacientes.find(p => p.id === id);
    return p ? `${p.nombres} ${p.apellidos}` : 'Desconocido';
  }

  getPacienteCedula(id: string): string {
    const p = this.pacientes.find(p => p.id === id);
    return p?.numero_identificacion || '';
  }

  getPacienteInicial(id: string): string {
    const p = this.pacientes.find(p => p.id === id);
    return p ? `${p.nombres?.charAt(0)}${p.apellidos?.charAt(0)}` : '?';
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

  // Navegacion
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
      'admin-estadisticas-pacientes': '/admin-ver-pacientes',
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
    const toast = await this.toastCtrl.create({ message: msg, color, duration: 3000, position: 'bottom' });
    await toast.present();
  }
}