import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-medicoinformes',
  templateUrl: './medicoinformes.page.html',
  styleUrls: ['./medicoinformes.page.scss'],
  standalone: false,
})
export class MedicoinformesPage implements OnInit {

  // 👤 UI State
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombreDoctor: string = '';
  especialidad: string = '';
  cargando = true;

  // 🔍 Filtros
  filtroPeriodo: string = '30';
  tipoInforme: string = 'todos';

  // 📊 Informes
  informesIA: any = {
    confianzaPromedio: 0,
    tendenciaConfianza: 0,
    tasaAceptacion: 0,
    perfilMasRecomendado: '',
    cantidadPerfilTop: 0,
    precisionPrediccion: 0,
    evolucionConfianza: [],
    distribucionPerfiles: []
  };

  informesPacientes: any = {
    totalPacientes: 0,
    nuevosEsteMes: 0,
    pacientesActivos: 0,
    pacientesRiesgo: 0,
    promedioEdad: 0,
    edadMin: 0,
    edadMax: 0,
    distribucionSexo: { masculino: 0, femenino: 0 },
    porcentajeSexo: { masculino: 0, femenino: 0 }
  };

  informesPlanes: any = {
    totalPlanes: 0,
    planesEsteMes: 0,
    planesActivos: 0,
    planesCompletados: 0,
    planesBorrador: 0,
    planesCancelados: 0,
    tasaExito: 0,
    duracionPromedio: 0,
    porcentajeEstados: { activo: 0, completado: 0, borrador: 0, cancelado: 0 }
  };

  informesAlertas: any = {
    presionAlta: 0,
    glucosaAlta: 0,
    imcFueraRango: 0,
    hba1cAlta: 0,
    pacientesRiesgo: []
  };

  informesRegistros: any = {
    finalizados: 0,
    enProceso: 0,
    cancelados: 0,
    tiempoPromedio: 0,
    tasaCancelacion: 0,
    eficiencia: 0
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    this.cargarDatosUsuario();
    await this.cargarInformes();
  }

  private cargarDatosUsuario(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreDoctor = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Dr. Usuario';
        this.especialidad = user.rol === 'medico' ? 'Médico Especialista' : 
                           user.rol === 'nutricionista' ? 'Nutricionista' : 'Especialista';
      } catch (e) {
        console.warn('⚠️ Error parseando usuario');
      }
    }
  }

  async cargarInformes(): Promise<void> {
    this.cargando = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticación');

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      // Cargar todos los informes en paralelo
      await Promise.all([
        this.cargarInformesIA(headers),
        this.cargarInformesPacientes(headers),
        this.cargarInformesPlanes(headers),
        this.cargarInformesAlertas(headers),
        this.cargarInformesRegistros(headers)
      ]);

    } catch (error: any) {
      console.error('❌ Error cargando informes:', error);
      await this.showToast('Error al cargar informes', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  private async cargarInformesIA(headers: HttpHeaders): Promise<void> {
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/informes/ia`,
        { headers }
      ).toPromise();

      if (response && !response.error) {
        this.informesIA = response.informes;
      }
    } catch (error) {
      console.warn('⚠️ No se pudieron cargar informes de IA');
    }
  }

  private async cargarInformesPacientes(headers: HttpHeaders): Promise<void> {
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/informes/pacientes`,
        { headers }
      ).toPromise();

      if (response && !response.error) {
        this.informesPacientes = response.informes;
      }
    } catch (error) {
      console.warn('⚠️ No se pudieron cargar informes de pacientes');
    }
  }

  private async cargarInformesPlanes(headers: HttpHeaders): Promise<void> {
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/informes/planes`,
        { headers }
      ).toPromise();

      if (response && !response.error) {
        this.informesPlanes = response.informes;
      }
    } catch (error) {
      console.warn('⚠️ No se pudieron cargar informes de planes');
    }
  }

  private async cargarInformesAlertas(headers: HttpHeaders): Promise<void> {
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/informes/alertas`,
        { headers }
      ).toPromise();

      if (response && !response.error) {
        this.informesAlertas = response.informes;
      }
    } catch (error) {
      console.warn('⚠️ No se pudieron cargar informes de alertas');
    }
  }

  private async cargarInformesRegistros(headers: HttpHeaders): Promise<void> {
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/informes/registros`,
        { headers }
      ).toPromise();

      if (response && !response.error) {
        this.informesRegistros = response.informes;
      }
    } catch (error) {
      console.warn('⚠️ No se pudieron cargar informes de registros');
    }
  }

  aplicarFiltros(): void {
    console.log('🔍 Aplicando filtros:', { periodo: this.filtroPeriodo, tipo: this.tipoInforme });
    // Aquí puedes recargar los datos con los filtros aplicados
    this.cargarInformes();
  }

  verPaciente(pacienteId: string): void {
    this.router.navigate(['/medicoconsultarpaciente', pacienteId]);
  }

  async contactarPaciente(paciente: any): Promise<void> {
    if (!paciente.telefono) {
      await this.showToast('El paciente no tiene teléfono registrado', 'warning');
      return;
    }

    let telefonoLimpio = paciente.telefono.replace(/[\s\-\(\)]/g, '');
    if (telefonoLimpio.startsWith('0')) {
      telefonoLimpio = telefonoLimpio.substring(1);
    }
    if (!telefonoLimpio.startsWith('593')) {
      telefonoLimpio = '593' + telefonoLimpio;
    }

    const mensaje = `Hola ${paciente.nombre}, soy el Dr. ${this.nombreDoctor}. He revisado tus últimos registros clínicos y necesito contactarte para dar seguimiento a tu tratamiento. ¿Podemos coordinar una cita?`;
    
    const url = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  async exportarInformes(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Exportar Informes',
      message: '¿En qué formato deseas exportar los informes?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'PDF',
          handler: () => {
            this.showToast('📄 Generando PDF... (Funcionalidad en desarrollo)', 'primary');
          }
        },
        {
          text: 'Excel',
          handler: () => {
            this.showToast('📊 Generando Excel... (Funcionalidad en desarrollo)', 'primary');
          }
        }
      ]
    });
    await alert.present();
  }

  // 🧭 Navegación
  navegarA(ruta: string): void {
    const rutas: Record<string, string> = {
      'medico': '/medico',
      'medicoverpacientes': '/medicoverpacientes',
      'agregar-paciente': '/agregar-paciente',
      'buscar-paciente': '/buscar-paciente',
      'medicoplanesnutricionalescreados': '/medicoplanesnutricionalescreados',
      'medicoseguimientoclinico': '/medicoseguimientoclinico',
      'medicoinformes': '/medicoinformes',
      'medico-configuracion': '/medico-configuracion'
    };
    this.router.navigate([rutas[ruta] || `/${ruta}`]);
    this.submenuAbierto = null;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleSubmenu(item: string): void {
    this.submenuAbierto = this.submenuAbierto === item ? null : item;
  }

  async cerrarSesion(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cerrar',
          handler: () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            this.router.navigate(['/principal'], { replaceUrl: true });
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(message: string, color: 'primary'|'success'|'danger'|'warning' = 'primary', duration: number = 3000): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration,
      position: 'bottom'
    });
    await toast.present();
  }
}