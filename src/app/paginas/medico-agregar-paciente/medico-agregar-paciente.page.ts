import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-medico-agregar-paciente',
  templateUrl: './medico-agregar-paciente.page.html',
  styleUrls: ['./medico-agregar-paciente.page.scss'],
  standalone: false,
})
export class MedicoAgregarPacientePage implements OnInit {

  // UI State
  sidebarOpen = false;
  submenuAbierto: string | null = 'pacientes';
  nombreDoctor: string = 'Dr. Usuario';
  especialidad: string = 'Especialista';
  guardando = false;

  // Form
  pacienteForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    // Campos iguales a los que usa enfermeria
    this.pacienteForm = this.fb.group({
      nombres: ['', [Validators.required, Validators.minLength(2)]],
      apellidos: ['', [Validators.required, Validators.minLength(2)]],
      numero_identificacion: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      fecha_nacimiento: ['', Validators.required],
      sexo: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      direccion: [''],
      ocupacion: [''],
      actividad_fisica: ['']
    });
  }

  async ngOnInit() {
    this.cargarDatosUsuario();
  }

  private cargarDatosUsuario() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreDoctor = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Dr. Usuario';
        this.especialidad = user.rol === 'doctor' ? 'Medico Especialista' : 
                           user.rol === 'nutricionista' ? 'Nutricionista' : 'Especialista';
      } catch (e) { 
        console.warn('Error parseando usuario'); 
      }
    }
  }

  isInvalid(campo: string): boolean {
    const control = this.pacienteForm.get(campo);
    return control ? (control.invalid && (control.dirty || control.touched)) : false;
  }

  async guardarPaciente() {
    if (this.pacienteForm.invalid) {
      await this.showToast('Complete todos los campos obligatorios', 'danger');
      Object.keys(this.pacienteForm.controls).forEach(key => {
        this.pacienteForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.guardando = true;
    const loading = await this.loadingCtrl.create({
      message: 'Registrando paciente...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticacion');

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      const formData = this.pacienteForm.value;

      // Enviar al backend con los mismos campos que usa enfermeria
      const response: any = await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/medico/pacientes`,
        formData,
        { headers }
      ).toPromise();

      await loading.dismiss();

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      await this.mostrarExito(formData.nombres + ' ' + formData.apellidos);

    } catch (error: any) {
      await loading.dismiss();
      console.error('Error registrando paciente:', error);
      await this.showToast(error.message || 'Error al registrar el paciente', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  private async mostrarExito(nombreCompleto: string) {
    const alert = await this.alertCtrl.create({
      header: 'Paciente Registrado',
      message: `El paciente <strong>${nombreCompleto}</strong> ha sido registrado exitosamente.<br><br>Que desea hacer ahora?`,
      buttons: [
        {
          text: 'Registrar Otro',
          handler: () => {
            this.limpiarFormulario();
          }
        },
        {
          text: 'Ver Lista',
          handler: () => {
            this.navegarA('medicoverpacientes');
          }
        }
      ]
    });
    await alert.present();
  }

  limpiarFormulario() {
    this.pacienteForm.reset();
    this.showToast('Formulario limpiado', 'success');
  }

  // Helpers de UI
  toggleSidebar() { 
    this.sidebarOpen = !this.sidebarOpen; 
  }
  
  toggleSubmenu(item: string) { 
    this.submenuAbierto = this.submenuAbierto === item ? null : item; 
  }
  
  navegarA(ruta: string) {
    const rutas: Record<string, string> = {
      'medico': '/medico',
      'medicoverpacientes': '/medicoverpacientes',
      'medico-agregar-paciente': '/medico-agregar-paciente',
      'medico-buscar-paciente': '/medico-buscar-paciente',
      'medicoplanesnutricionalescreados': '/medicoplanesnutricionalescreados',
      'medicoseguimientoclinico': '/medicoseguimientoclinico',
      'medico-informes': '/medico-informes',
      'medico-configuracion': '/medico-configuracion'
    };
    
    this.router.navigate([rutas[ruta] || `/${ruta}`]);
    this.submenuAbierto = null;
  }
  
  async cerrarSesion() {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar Sesion',
      message: 'Estas seguro de que deseas cerrar sesion?',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'alert-button-cancel' },
        {
          text: 'Salir',
          cssClass: 'alert-button-confirm',
          handler: async () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            await this.showToast('Sesion cerrada exitosamente', 'success');
            this.router.navigate(['/principal'], { replaceUrl: true });
          }
        }
      ],
      cssClass: 'alert-logout'
    });
    await alert.present();
  }
  
  async showToast(message: string, color: 'primary'|'success'|'danger'|'warning' = 'primary', duration: number = 3000) {
    await this.toastCtrl.create({ message, color, duration, position: 'bottom' }).then(t => t.present());
  }
}