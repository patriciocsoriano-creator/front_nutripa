import { Component, HostListener, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoadingController, ToastController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-medicovermediciones',
  templateUrl: './medicovermediciones.page.html',
  styleUrls: ['./medicovermediciones.page.scss'],
  standalone: false,
})
export class MedicovermedicionesPage implements OnInit {

  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombreDoctor: string = 'Dr. Usuario';
  especialidad: string = 'Especialista';

  paciente: any = null;
  cargando = false;
  errorCarga: string | null = null;
  pacienteId: string | null = null;

  tabActiva: string = 'glucosa';
  
  // Glucosa
  medicionesGlucosa: any[] = [];
  estadisticasGlucosa: any = null;
  cargandoGlucosa = false;
  
  // Presión
  medicionesPresion: any[] = [];
  estadisticasPresion: any = null;
  cargandoPresion = false;

  diasHistorial = 30;
  
  filtrosDias = [
    { dias: 1, label: 'Hoy' },
    { dias: 7, label: '7 días' },
    { dias: 15, label: '15 días' },
    { dias: 30, label: '30 días' },
    { dias: 90, label: '3 meses' }
  ];

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    this.cargarDatosUsuario();
    
    // Obtener paciente_id de query params o state
    this.pacienteId = this.activatedRoute.snapshot.queryParamMap.get('paciente_id');
    
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state?.['pacienteData']) {
      this.paciente = navigation.extras.state['pacienteData'];
    }
    
    console.log('[DEBUG] pacienteId:', this.pacienteId);
    
    if (this.pacienteId) {
      if (!this.paciente) {
        await this.cargarInfoPaciente();
      }
      await this.cargarMediciones();
    } else {
      this.errorCarga = 'No se especificó el paciente';
    }
  }

  private cargarDatosUsuario() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreDoctor = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Dr. Usuario';
        this.especialidad = user.rol === 'medico' ? 'Médico Especialista' : 
                           user.rol === 'nutricionista' ? 'Nutricionista' : 'Especialista';
      } catch (e) { 
        console.warn('Error parseando usuario:', e); 
      }
    }
  }

  async cargarInfoPaciente() {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticación');

      const url = `${environment.apiUrl}/nutricionapp-api/medico/paciente/${this.pacienteId}/detalle`;
      
      const response: any = await this.http.get(url, {
        headers: new HttpHeaders({ 
          'Authorization': `Bearer ${token}`
        })
      }).toPromise();

      if (response?.paciente) {
        this.paciente = response.paciente;
      }
    } catch (error) {
      console.error('Error cargando info paciente:', error);
    }
  }

  async cargarMediciones() {
    this.cargando = true;
    this.errorCarga = null;
    
    await this.cargarGlucosa();
    await this.cargarPresion();
    
    this.cargando = false;
  }

  async cargarGlucosa() {
    this.cargandoGlucosa = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const url = `${environment.apiUrl}/nutricionapp-api/medico/paciente/${this.pacienteId}/glucosa?dias=${this.diasHistorial}`;
      
      const response: any = await this.http.get(url, {
        headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
      }).toPromise();

      if (response?.error === false) {
        this.medicionesGlucosa = response.mediciones || [];
        this.estadisticasGlucosa = response.estadisticas || null;
      }
    } catch (error) {
      console.error('Error cargando glucosa:', error);
    } finally {
      this.cargandoGlucosa = false;
    }
  }

  async cargarPresion() {
    this.cargandoPresion = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const url = `${environment.apiUrl}/nutricionapp-api/medico/paciente/${this.pacienteId}/presion?dias=${this.diasHistorial}`;
      
      const response: any = await this.http.get(url, {
        headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
      }).toPromise();

      if (response?.error === false) {
        this.medicionesPresion = response.mediciones || [];
        this.estadisticasPresion = response.estadisticas || null;
      }
    } catch (error) {
      console.error('Error cargando presion:', error);
    } finally {
      this.cargandoPresion = false;
    }
  }

  cambiarTab() {
    console.log('[TAB] Cambiando a:', this.tabActiva);
  }

  async cambiarFiltroDias(dias: number) {
    this.diasHistorial = dias;
    await this.cargarGlucosa();
    await this.cargarPresion();
  }

  toggleSidebar() { 
    this.sidebarOpen = !this.sidebarOpen; 
  }

  toggleSubmenu(item: string) { 
    this.submenuAbierto = this.submenuAbierto === item ? null : item; 
  }

  navegarA(ruta: string) {
    this.sidebarOpen = false;
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
    const rutaDestino = rutas[ruta] || `/${ruta}`;
    this.router.navigate([rutaDestino]);
    this.submenuAbierto = null;
  }

  async cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/principal'], { replaceUrl: true });
  }

  // Helpers para Glucosa
  getClasificacionGlucosa(valor: number, tipoMomento: string): string {
    if (!valor) return '';
    if (tipoMomento === 'ayunas') {
      if (valor >= 126) return 'Elevada';
      if (valor >= 100) return 'Pre-diabetes';
      if (valor >= 70) return 'Normal';
      return 'Baja';
    } else {
      if (valor >= 200) return 'Elevada';
      if (valor >= 140) return 'Elevada';
      return 'Normal';
    }
  }

  getClasificacionGlucosaColor(valor: number): string {
    if (!valor) return '';
    if (valor >= 126) return 'valor-alto';
    if (valor >= 100) return 'valor-medio';
    if (valor >= 70) return 'valor-normal';
    return 'valor-bajo';
  }

  getMomentoIcono(tipo: string): string {
    const iconos: Record<string, string> = {
      'ayunas': 'sunny-outline',
      'antes_comida': 'restaurant-outline',
      'despues_comida': 'restaurant-outline',
      'postprandial': 'restaurant-outline',
      'antes_dormir': 'moon-outline',
      'otro': 'time-outline'
    };
    return iconos[tipo] || 'time-outline';
  }

  getMomentoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      'ayunas': 'En ayunas',
      'antes_comida': 'Antes de comer',
      'despues_comida': 'Después de comer',
      'postprandial': 'Postprandial',
      'antes_dormir': 'Antes de dormir',
      'otro': 'Otro momento'
    };
    return labels[tipo] || tipo;
  }

  // Helpers para Presión
  getClasificacionPresion(sistolica: number, diastolica: number): string {
    if (!sistolica || !diastolica) return '';
    const sis = parseInt(String(sistolica));
    const dia = parseInt(String(diastolica));
    if (sis > 180 || dia > 120) return 'Crisis Hipertensiva';
    if (sis >= 140 || dia >= 90) return 'Hipertensión Etapa 2';
    if (sis >= 130 || dia >= 80) return 'Hipertensión Etapa 1';
    if (sis >= 120 && dia < 80) return 'Presión Elevada';
    return 'Normal';
  }

  getClasificacionPresionColor(sistolica: number, diastolica: number): string {
    if (!sistolica || !diastolica) return '';
    const sis = parseInt(String(sistolica));
    const dia = parseInt(String(diastolica));
    if (sis > 180 || dia > 120) return 'valor-crisis';
    if (sis >= 140 || dia >= 90) return 'valor-alta2';
    if (sis >= 130 || dia >= 80) return 'valor-alta1';
    if (sis >= 120 && dia < 80) return 'valor-elevada';
    return 'valor-normal';
  }

  getPosicionLabel(posicion: string): string {
    const labels: Record<string, string> = {
      'sentado': 'Sentado',
      'acostado': 'Acostado',
      'de_pie': 'De pie'
    };
    return labels[posicion] || posicion;
  }

  volver() {
    if (this.pacienteId) {
      this.router.navigate(['/medicoconsultarpaciente'], {
        queryParams: { paciente_id: this.pacienteId }
      });
    } else {
      this.router.navigate(['/medicoverpacientes']);
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-item-with-submenu')) {
      this.submenuAbierto = null;
    }
  }
}