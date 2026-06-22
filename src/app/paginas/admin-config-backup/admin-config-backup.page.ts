import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastController, AlertController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-config-backup',
  templateUrl: './admin-config-backup.page.html',
  styleUrls: ['./admin-config-backup.page.scss'],
  standalone: false,
})
export class AdminConfigBackupPage implements OnInit {
  tablas: any[] = [];
  cargando = false;
  totalTablas = 0;
  tamanioTotal = 0;
  fechaBackup = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.cargarInfoBackup();
  }

  async cargarInfoBackup() {
    this.cargando = true;
    const token = localStorage.getItem('token');

    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/configuracion/backup`,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      if (response?.error === false) {
        this.tablas = response.tablas || [];
        this.totalTablas = response.total_tablas || 0;
        this.fechaBackup = response.fecha_backup || '';
        this.tamanioTotal = this.tablas.reduce((sum: number, t: any) => sum + (t.tamanio_mb || 0), 0);
      }
    } catch (error) {
      console.error('Error cargando backup:', error);
      await this.showToast('Error al cargar información', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  async confirmarExportar() {
    const alert = await this.alertCtrl.create({
      header: '💾 Exportar Base de Datos',
      message: '¿Desea exportar toda la base de datos en formato SQL?<br><br><em>Se descargará un archivo .sql con toda la estructura y datos.</em>',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Exportar',
          handler: () => this.exportarBD()
        }
      ]
    });
    await alert.present();
  }

  exportarBD() {
    const token = localStorage.getItem('token');
    window.open(
      `${environment.apiUrl}/nutricionapp-api/admin/configuracion/backup/exportar?token=${token}`,
      '_blank'
    );
    this.showToast('✅ Descarga iniciada', 'success');
  }

  async confirmarImportar() {
    const alert = await this.alertCtrl.create({
      header: '⚠️ Importar Base de Datos',
      message: '<strong>¡ADVERTENCIA!</strong><br><br>Importar una base de datos <strong>reemplazará todos los datos actuales</strong>.<br><br>¿Está seguro de continuar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Importar',
          cssClass: 'alert-button-danger',
          handler: () => {
            this.showToast('Función de importar en desarrollo', 'warning');
          }
        }
      ]
    });
    await alert.present();
  }

  getTamanioColor(tamanio: number): string {
    if (tamanio < 1) return 'success';
    if (tamanio < 10) return 'warning';
    return 'danger';
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msg, color, duration: 2500, position: 'bottom' });
    await toast.present();
  }
}