import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-medico-buscar-paciente',
  templateUrl: './medico-buscar-paciente.page.html',
  styleUrls: ['./medico-buscar-paciente.page.scss'],
  standalone: false,
})
export class MedicoBuscarPacientePage implements OnInit {

  // UI State
  sidebarOpen = false;
  submenuAbierto: string | null = 'pacientes';
  nombreDoctor: string = 'Dr. Usuario';
  especialidad: string = 'Especialista';
  
  // Busqueda
  terminoBusqueda: string = '';
  filtroTipo: 'todos' | 'cedula' | 'nombre' | 'telefono' = 'todos';
  resultados: any[] = [];
  cargando = false;
  
  private searchTimeout: any;

  constructor(
    private router: Router,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

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

  buscarPacientes() {
    // Limpiar timeout anterior
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Si no hay termino, limpiar resultados
    if (!this.terminoBusqueda || this.terminoBusqueda.length < 2) {
      this.resultados = [];
      return;
    }

    // Debounce de 300ms
    this.searchTimeout = setTimeout(() => {
      this.ejecutarBusqueda();
    }, 300);
  }

  private async ejecutarBusqueda() {
    this.cargando = true;
    const token = localStorage.getItem('token');

    try {
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      // Usar endpoint de busqueda existente
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/pacientes/buscar`,
        { 
          headers,
          params: { 
            q: this.terminoBusqueda,
            tipo: this.filtroTipo 
          }
        }
      ).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      this.resultados = response.resultados || response.pacientes || [];
      
      // Si es busqueda por cedula especifica, filtrar localmente
      if (this.filtroTipo === 'cedula') {
        this.resultados = this.resultados.filter(p => 
          (p.numero_identificacion || p.cedula)?.includes(this.terminoBusqueda)
        );
      } else if (this.filtroTipo === 'telefono') {
        this.resultados = this.resultados.filter(p => 
          p.telefono?.includes(this.terminoBusqueda)
        );
      }

      console.log(`Busqueda: "${this.terminoBusqueda}" - ${this.resultados.length} resultados`);

    } catch (error: any) {
      console.error('Error en busqueda:', error);
      await this.showToast('Error al buscar pacientes', 'danger');
      this.resultados = [];
    } finally {
      this.cargando = false;
    }
  }

  // Ver detalle del paciente
  verDetalle(paciente: any) {
    this.router.navigate(['/medicoconsultarpaciente', paciente.id]);
  }

  // Ver plan alimenticio
  async verPlanAlimenticio(paciente: any) {
    const loading = await this.loadingCtrl.create({
      message: 'Buscando plan alimenticio...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/plan-nutricional/paciente/${paciente.id}`,
        { headers }
      ).toPromise();

      await loading.dismiss();

      if (response?.error || !response?.planes?.length) {
        const alert = await this.alertCtrl.create({
          header: 'Sin Plan Alimenticio',
          message: `El paciente <strong>${paciente.nombres} ${paciente.apellidos}</strong> aun no tiene un plan alimenticio guardado.`,
          buttons: ['Entendido']
        });
        await alert.present();
        return;
      }

      const planMasReciente = response.planes[0];

      this.router.navigate(['/medicoplanalimenticio-detalle'], {
        state: {
          planId: planMasReciente.id,
          pacienteId: paciente.id,
          pacienteNombre: `${paciente.nombres} ${paciente.apellidos}`
        }
      });

    } catch (error: any) {
      await loading.dismiss();
      console.error('Error obteniendo plan:', error);
      await this.showToast('No se pudo cargar el plan alimenticio', 'danger');
    }
  }

  // Ver seguimiento clinico
  verSeguimiento(paciente: any) {
    this.router.navigate(['/medicoseguimientoclinico', paciente.id], {
      state: { pacienteId: paciente.id }
    });
  }

  // Contactar por WhatsApp
  contactarWhatsApp(paciente: any) {
    if (!paciente.telefono) {
      this.showToast('El paciente no tiene telefono registrado', 'warning');
      return;
    }

    let telefonoLimpio = paciente.telefono.replace(/[\s\-\(\)]/g, '');
    if (telefonoLimpio.startsWith('0')) {
      telefonoLimpio = telefonoLimpio.substring(1);
    }
    if (!telefonoLimpio.startsWith('593')) {
      telefonoLimpio = '593' + telefonoLimpio;
    }

    const mensaje = `Hola ${paciente.nombres}, soy el Dr. ${this.nombreDoctor}. Te contacto desde NutriPa.`;
    const url = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
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

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-item-with-submenu')) {
      this.submenuAbierto = null;
    }
  }
}