import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertController, ToastController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-ver-pacientes',
  templateUrl: './admin-ver-pacientes.page.html',
  styleUrls: ['./admin-ver-pacientes.page.scss'],
  standalone: false,
})
export class AdminVerPacientesPage implements OnInit {
  pacientes: any[] = [];
  pacientesFiltrados: any[] = [];
  cargando = false;
  terminoBusqueda = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.cargarPacientes();
  }

  async cargarPacientes() {
    this.cargando = true;
    const token = localStorage.getItem('token');
    
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/pacientes`,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      if (response?.error === false) {
        this.pacientes = response.pacientes || [];
        this.aplicarFiltros();
      } else {
        await this.showToast('Error al cargar pacientes', 'danger');
      }
    } catch (error) {
      console.error('Error cargando pacientes:', error);
      await this.showToast('Error al cargar pacientes', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  aplicarFiltros() {
    let filtrados = [...this.pacientes];
    
    if (this.terminoBusqueda) {
      const t = this.terminoBusqueda.toLowerCase();
      filtrados = filtrados.filter(p => 
        p.nombres?.toLowerCase().includes(t) ||
        p.apellidos?.toLowerCase().includes(t) ||
        p.numero_identificacion?.includes(t) ||
        p.telefono?.includes(t)
      );
    }

    this.pacientesFiltrados = filtrados;
  }

  calcularEdad(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  }

  getSexoLabel(sexo: string): string {
    const labels: Record<string, string> = {
      'M': 'Masculino',
      'F': 'Femenino',
      'O': 'Otro'
    };
    return labels[sexo] || sexo;
  }

  volver() {
    this.router.navigate(['/administrador']);
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msg, color, duration: 2500, position: 'bottom' });
    await toast.present();
  }
}