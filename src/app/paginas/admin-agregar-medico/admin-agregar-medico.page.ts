import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoadingController, ToastController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-agregar-medico',
  templateUrl: './admin-agregar-medico.page.html',
  styleUrls: ['./admin-agregar-medico.page.scss'],
  standalone: false,
})
export class AdminAgregarMedicoPage implements OnInit {
  form = {
    nombre: '',
    apellido: '',
    cedula: '',
    correo: '',
    telefono: '',
    especialidad: '',
    password: '',
    confirmarPassword: '',
    genero: 'M'
  };

  especialidades = [
    'Nutricionista', 'Médico General', 'Endocrinólogo', 
    'Cardiólogo', 'Pediatra', 'Otro'
  ];

  constructor(
    private router: Router,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {}

  async guardarMedico() {
    if (this.form.password !== this.form.confirmarPassword) {
      await this.showToast('Las contraseñas no coinciden', 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Guardando...' });
    await loading.present();

    const token = localStorage.getItem('token');
    try {
      const response: any = await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/admin/medicos`,
        { ...this.form, rol: 'doctor' },
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      await loading.dismiss();
      
      if (response?.error === false) {
        await this.showToast('Médico registrado exitosamente', 'success');
        this.router.navigate(['/administrador']);
      } else {
        await this.showToast(response?.mensaje || 'Error al guardar', 'danger');
      }
    } catch (error: any) {
      await loading.dismiss();
      await this.showToast(error?.error?.mensaje || 'Error al guardar', 'danger');
    }
  }

  volver() {
    this.router.navigate(['/administrador']);
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msg, color, duration: 2500 });
    await toast.present();
  }
}