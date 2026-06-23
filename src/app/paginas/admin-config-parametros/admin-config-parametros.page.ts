import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastController, LoadingController, AlertController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-config-parametros',
  templateUrl: './admin-config-parametros.page.html',
  styleUrls: ['./admin-config-parametros.page.scss'],
  standalone: false,
})
export class AdminConfigParametrosPage implements OnInit {
  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = 'configuracion';
  nombreAdmin: string = '';
  rol: string = 'Administrador';
  private isMobile = false;

  // Estado
  cargando = false;
  guardando = false;
  entrenando = false;

  modeloIA: any = {
    arquitectura: 'MLP',
    capas_ocultas: '64,32',
    activacion: 'relu',
    epochs: 100,
    batch_size: 32,
    learning_rate: 0.001,
    dropout: 0.3,
    optimizer: 'adam',
    precision_actual: 0,
    ultima_entrenamiento: null,
    estado: 'inactivo'
  };

  metricas: any = {
    precision: 0,
    recall: 0,
    f1_score: 0,
    total_predicciones: 0,
    confianza_promedio: 0
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
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
    this.cargarParametrosIA();
    this.cargarMetricas();
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

  async cargarParametrosIA() {
    this.cargando = true;
    const token = localStorage.getItem('token');

    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/configuracion/parametros`,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      if (response?.error === false && response.parametros) {
        response.parametros.forEach((p: any) => {
          if (p.clave.startsWith('ia_')) {
            const clave = p.clave.replace('ia_', '');
            if (clave in this.modeloIA) {
              const valorActual = this.modeloIA[clave];
              if (typeof valorActual === 'number') {
                this.modeloIA[clave] = parseFloat(p.valor);
              } else {
                this.modeloIA[clave] = p.valor;
              }
            }
          }
        });
        console.log('Parametros IA cargados');
      }
    } catch (error) {
      console.error('Error cargando parametros IA:', error);
    } finally {
      this.cargando = false;
    }
  }

  async cargarMetricas() {
    const token = localStorage.getItem('token');

    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/ia/metricas`,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      if (response?.error === false) {
        this.metricas = {
          precision: response.precision || 0,
          recall: response.recall || 0,
          f1_score: response.f1_score || 0,
          total_predicciones: response.total_predicciones || 0,
          confianza_promedio: response.confianza_promedio || 0
        };
        console.log('Metricas cargadas');
      }
    } catch (error) {
      console.error('Error cargando metricas:', error);
    }
  }

  async guardarParametros() {
    this.guardando = true;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    try {
      const claves = Object.keys(this.modeloIA);
      for (const clave of claves) {
        await this.http.put(
          `${environment.apiUrl}/nutricionapp-api/admin/configuracion/parametros/ia_${clave}`,
          { valor: String(this.modeloIA[clave]), descripcion: `Parametro IA: ${clave}` },
          { headers }
        ).toPromise();
      }

      await this.showToast('Parametros guardados correctamente', 'success');
    } catch (error) {
      console.error('Error guardando:', error);
      await this.showToast('Error al guardar los parametros', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  async confirmarReentrenamiento() {
    const alert = await this.alertCtrl.create({
      header: 'Reentrenar Modelo IA',
      message: `Desea reentrenar el modelo con los nuevos parametros?<br><br>
        <strong>Arquitectura:</strong> ${this.modeloIA.arquitectura}<br>
        <strong>Capas:</strong> ${this.modeloIA.capas_ocultas}<br>
        <strong>Epochs:</strong> ${this.modeloIA.epochs}<br><br>
        <em>Este proceso puede tomar varios minutos.</em>`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Reentrenar',
          handler: () => this.reentrenarModelo()
        }
      ]
    });
    await alert.present();
  }

  async reentrenarModelo() {
    this.entrenando = true;
    const token = localStorage.getItem('token');

    try {
      const response: any = await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/admin/ia/reentrenar`,
        this.modeloIA,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      if (response?.error === false) {
        await this.showToast('Modelo reentrenado exitosamente', 'success');
        this.cargarMetricas();
      } else {
        await this.showToast(response?.mensaje || 'Error al reentrenar', 'danger');
      }
    } catch (error) {
      console.error('Error reentrenando:', error);
      await this.showToast('Error al reentrenar el modelo', 'danger');
    } finally {
      this.entrenando = false;
    }
  }

  async descargarModelo() {
    const token = localStorage.getItem('token');
    window.open(
      `${environment.apiUrl}/nutricionapp-api/admin/ia/descargar-modelo?token=${token}`,
      '_blank'
    );
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