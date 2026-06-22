import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-asignaciones',
  templateUrl: './admin-asignaciones.page.html',
  styleUrls: ['./admin-asignaciones.page.scss'],
  standalone: false,
})
export class AdminAsignacionesPage implements OnInit {
  medicos: any[] = [];
  pacientes: any[] = [];
  asignaciones: any[] = [];
  cargando = false;
  
  nuevaAsignacion = {
    medico_id: '',
    paciente_id: ''
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.cargarDatos();
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
    } catch (error) {
      console.error('Error cargando datos:', error);
      await this.showToast('Error al cargar datos', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  async crearAsignacion() {
    if (!this.nuevaAsignacion.medico_id || !this.nuevaAsignacion.paciente_id) {
      await this.showToast('Seleccione médico y paciente', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Asignando...' });
    await loading.present();

    const token = localStorage.getItem('token');
    try {
      await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/admin/asignaciones`,
        this.nuevaAsignacion,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      await loading.dismiss();
      await this.showToast('Asignación creada', 'success');
      this.nuevaAsignacion = { medico_id: '', paciente_id: '' };
      this.cargarDatos();
    } catch (error: any) {
      await loading.dismiss();
      await this.showToast(error?.error?.mensaje || 'Error al asignar', 'danger');
    }
  }

  async eliminarAsignacion(asig: any) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar Asignación',
      message: '¿Eliminar esta asignación?',
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
              await this.showToast('Asignación eliminada', 'success');
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

  getMedicoNombre(id: string): string {
    const m = this.medicos.find(m => m.id === id);
    return m ? `Dr. ${m.nombre} ${m.apellido}` : 'Desconocido';
  }

  getPacienteNombre(id: string): string {
    const p = this.pacientes.find(p => p.id === id);
    return p ? `${p.nombres} ${p.apellidos}` : 'Desconocido';
  }

  volver() {
    this.router.navigate(['/administrador']);
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msg, color, duration: 2500 });
    await toast.present();
  }
}