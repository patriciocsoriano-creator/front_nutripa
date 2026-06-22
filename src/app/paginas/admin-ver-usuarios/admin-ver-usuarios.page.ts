import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-ver-usuarios',
  templateUrl: './admin-ver-usuarios.page.html',
  styleUrls: ['./admin-ver-usuarios.page.scss'],
  standalone: false,
})
export class AdminVerUsuariosPage implements OnInit {
  usuarios: any[] = [];
  usuariosFiltrados: any[] = [];
  cargando = false;
  terminoBusqueda = '';
  filtroRol = 'todos';

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.cargarUsuarios();
  }

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
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      await this.showToast('Error al cargar usuarios', 'danger');
    } finally {
      this.cargando = false;
    }
  }

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

  async eliminarUsuario(usuario: any) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar Usuario',
      message: `¿Eliminar a <strong>${usuario.nombre} ${usuario.apellido}</strong>?`,
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
              await this.showToast('Usuario eliminado', 'success');
              this.cargarUsuarios();
            } catch (error) {
              await this.showToast('Error al eliminar', 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

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

  volver() {
    this.router.navigate(['/administrador']);
  }

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

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msg, color, duration: 2500, position: 'bottom' });
    await toast.present();
  }
}