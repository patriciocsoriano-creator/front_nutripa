import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-config-parametros',
  templateUrl: './admin-config-parametros.page.html',
  styleUrls: ['./admin-config-parametros.page.scss'],
  standalone: false,
})
export class AdminConfigParametrosPage implements OnInit {
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
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.cargarParametrosIA();
    this.cargarMetricas();
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
      }
    } catch (error) {
      console.error('Error cargando parámetros IA:', error);
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
      }
    } catch (error) {
      console.error('Error cargando métricas:', error);
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
          { valor: String(this.modeloIA[clave]), descripcion: `Parámetro IA: ${clave}` },
          { headers }
        ).toPromise();
      }

      await this.showToast('✅ Parámetros guardados', 'success');
    } catch (error) {
      console.error('Error guardando:', error);
      await this.showToast('❌ Error al guardar', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  async confirmarReentrenamiento() {
    const alert = await this.alertCtrl.create({
      header: '🤖 Reentrenar Modelo IA',
      message: `¿Desea reentrenar el modelo con los nuevos parámetros?<br><br>
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
        await this.showToast('✅ Modelo reentrenado exitosamente', 'success');
        this.cargarMetricas();
      } else {
        await this.showToast('❌ ' + (response?.mensaje || 'Error al reentrenar'), 'danger');
      }
    } catch (error) {
      console.error('Error reentrenando:', error);
      await this.showToast('❌ Error al reentrenar modelo', 'danger');
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

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msg, color, duration: 3000, position: 'bottom' });
    await toast.present();
  }
}