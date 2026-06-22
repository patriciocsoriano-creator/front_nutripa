import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-config-general',
  templateUrl: './admin-config-general.page.html',
  styleUrls: ['./admin-config-general.page.scss'],
  standalone: false,
})
export class AdminConfigGeneralPage implements OnInit {
  cargando = false;
  guardando = false;

  config: any = {
    nombre_sistema: 'NutriPA',
    version: '1.0.0',
    descripcion: 'Sistema Clínico Nutricional con IA',
    email_contacto: '',
    telefono_contacto: '',
    direccion: '',
    max_intentos_login: 5,
    tiempo_sesion_minutos: 30,
    permitir_autoregistro: true,
    requerir_aprobacion_admin: false,
    modo_mantenimiento: false
  };

  configPorDefecto: any = {
    nombre_sistema: 'NutriPA',
    version: '1.0.0',
    descripcion: 'Sistema Clínico Nutricional con IA',
    email_contacto: '',
    telefono_contacto: '',
    direccion: '',
    max_intentos_login: 5,
    tiempo_sesion_minutos: 30,
    permitir_autoregistro: true,
    requerir_aprobacion_admin: false,
    modo_mantenimiento: false
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.cargarConfiguracion();
  }

  async cargarConfiguracion() {
    this.cargando = true;
    const token = localStorage.getItem('token');

    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/configuracion/parametros`,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      if (response?.error === false && response.parametros) {
        response.parametros.forEach((p: any) => {
          if (p.clave in this.config) {
            const valorActual = this.config[p.clave];
            
            if (typeof valorActual === 'boolean') {
              this.config[p.clave] = p.valor === 'true' || p.valor === '1';
            } else if (typeof valorActual === 'number') {
              this.config[p.clave] = parseInt(p.valor);
            } else {
              this.config[p.clave] = p.valor;
            }
          }
        });
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    } finally {
      this.cargando = false;
    }
  }

  async guardarConfiguracion() {
    this.guardando = true;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    try {
      const claves = Object.keys(this.config);
      for (const clave of claves) {
        await this.http.put(
          `${environment.apiUrl}/nutricionapp-api/admin/configuracion/parametros/${clave}`,
          { valor: String(this.config[clave]), descripcion: clave },
          { headers }
        ).toPromise();
      }

      await this.showToast('✅ Configuración guardada', 'success');
    } catch (error) {
      console.error('Error guardando:', error);
      await this.showToast('❌ Error al guardar', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  async confirmarReset() {
    const alert = await this.alertCtrl.create({
      header: '⚠️ Resetear Configuración',
      message: '¿Restaurar todos los valores por defecto?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Resetear',
          cssClass: 'alert-button-danger',
          handler: () => {
            this.config = { ...this.configPorDefecto };
            this.showToast('Valores reseteados. Recuerda guardar.', 'warning');
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