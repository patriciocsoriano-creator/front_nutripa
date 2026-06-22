import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertController, ToastController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-ver-medicos',
  templateUrl: './admin-ver-medicos.page.html',
  styleUrls: ['./admin-ver-medicos.page.scss'],
  standalone: false,
})
export class AdminVerMedicosPage implements OnInit {
  medicos: any[] = [];
  medicosFiltrados: any[] = [];
  cargando = false;
  terminoBusqueda = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.cargarMedicos();
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
      } else {
        await this.showToast('Error al cargar médicos', 'danger');
      }
    } catch (error) {
      console.error('Error cargando médicos:', error);
      await this.showToast('Error al cargar médicos', 'danger');
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
      await this.showToast(`Médico ${medico.activo ? 'desactivado' : 'activado'}`, 'success');
      this.cargarMedicos();
    } catch (error) {
      await this.showToast('Error al cambiar estado', 'danger');
    }
  }

  volver() {
    this.router.navigate(['/administrador']);
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msg, color, duration: 2500, position: 'bottom' });
    await toast.present();
  }
}