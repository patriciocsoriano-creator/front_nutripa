import { Component, HostListener, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoadingController, ToastController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-medicoconsultarpaciente',
  templateUrl: './medicoconsultarpaciente.page.html',
  styleUrls: ['./medicoconsultarpaciente.page.scss'],
  standalone: false,
})
export class MedicoconsultarpacientePage implements OnInit {

  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombreDoctor: string = 'Dr. Usuario';
  especialidad: string = 'Especialista';

  // Data del paciente
  paciente: any = null;
  historial: any[] = [];
  ultimosDatos: any = null;
  cargando = false;
  errorCarga: string | null = null;
  pacienteId: string | null = null;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    this.cargarDatosUsuario();
    
    // Múltiples formas de obtener el paciente_id
    console.log('[DEBUG] Snapshot params:', this.activatedRoute.snapshot.params);
    console.log('[DEBUG] Snapshot queryParams:', this.activatedRoute.snapshot.queryParams);
    
    // Opción 1: Route param
    const routeParam = this.activatedRoute.snapshot.paramMap.get('id') || 
                       this.activatedRoute.snapshot.paramMap.get('paciente_id');
    
    // Opción 2: Query param
    const queryParam = this.activatedRoute.snapshot.queryParamMap.get('paciente_id') ||
                       this.activatedRoute.snapshot.queryParamMap.get('id');
    
    // Opción 3: Desde navigation state
    const stateParam = this.router.getCurrentNavigation()?.extras?.state?.['paciente_id'] ||
                       this.router.getCurrentNavigation()?.extras?.state?.['id'];
    
    this.pacienteId = routeParam || queryParam || stateParam;
    
    console.log('[DEBUG] pacienteId obtenido:', this.pacienteId);
    
    if (this.pacienteId) {
      await this.cargarDetallePaciente();
    } else {
      this.errorCarga = 'No se especificó un paciente para consultar';
      console.warn('No se pudo obtener el paciente_id de ninguna fuente');
    }
  }

  // Cargar datos del médico desde localStorage
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

  // Cargar detalle del paciente desde API
  async cargarDetallePaciente() {
    if (!this.pacienteId) return;
    
    this.cargando = true;
    this.errorCarga = null;
    
    const loading = await this.loadingCtrl.create({ 
      message: 'Cargando historial clínico...', 
      spinner: 'crescent',
      cssClass: 'loading-custom'
    });
    await loading.present();

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticación. Por favor, inicia sesión nuevamente.');

      const url = `${environment.apiUrl}/nutricionapp-api/medico/paciente/${this.pacienteId}/detalle`;
      
      const response: any = await this.http.get(url, {
        headers: new HttpHeaders({ 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        })
      }).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje || 'Error en la respuesta del servidor');
      }
      
      if (!response?.paciente) {
        throw new Error('No se encontró información del paciente');
      }
      
      this.paciente = response.paciente;
      this.historial = response.historial || [];
      this.ultimosDatos = response.ultimos_datos || null;

    } catch (error: any) {
      console.error('Error cargando paciente:', error);
      this.errorCarga = error.message || 'Error desconocido al cargar los datos';
      
      await this.toastCtrl.create({ 
        message: 'No se pudo cargar la información del paciente', 
        color: 'danger', 
        duration: 3500, 
        position: 'bottom',
        icon: 'alert-circle-outline'
      }).then(t => t.present());
      
    } finally {
      await loading.dismiss();
      this.cargando = false;
    }
  }

  // Alternar sidebar
  toggleSidebar() { 
    this.sidebarOpen = !this.sidebarOpen; 
  }

  // Alternar submenú
  toggleSubmenu(item: string) { 
    this.submenuAbierto = this.submenuAbierto === item ? null : item; 
  }

  // Navegar a otra página
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

  // Cerrar sesión
  async cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_data');
    
    await this.toastCtrl.create({ 
      message: 'Sesión cerrada exitosamente', 
      color: 'success', 
      duration: 2000 
    }).then(t => t.present());
    
    this.router.navigate(['/principal'], { replaceUrl: true });
  }

  // Helpers para mostrar datos formateados
  getEdad(): string {
    if (!this.paciente?.edad) return 'N/A';
    return `${this.paciente.edad} años`;
  }

  getSexoLabel(): string {
    const map: Record<string, string> = { 
      'M': 'Masculino', 
      'F': 'Femenino', 
      'O': 'Otro' 
    };
    return map[this.paciente?.sexo] || 'No especificado';
  }

  getActividadFisicaLabel(): string {
    const map: Record<string, string> = {
      'sedentario': 'Sedentario',
      'ligera': 'Ligera',
      'moderada': 'Moderada',
      'intensa': 'Intensa',
      'atleta': 'Alto rendimiento'
    };
    return map[this.paciente?.actividad_fisica] || 'No registrada';
  }

  getIMCLabel(imc: number): string {
    if (!imc) return 'N/A';
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Normal';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidad';
  }

  getCondicionLabel(condicion: boolean): string {
    return condicion ? 'Sí' : 'No';
  }

  getBadgeColor(riesgo?: string): string {
    const colores: Record<string, string> = {
      'alto': 'danger',
      'medio': 'warning',
      'bajo': 'success'
    };
    return colores[riesgo || ''] || 'medium';
  }

  // Ver detalle de un registro clínico
  verRegistro(registro: any) {
  console.log('[HISTORIAL] Ver registro:', registro.id);
  this.router.navigate(['/medicoverregistro'], { 
    queryParams: { 
      paciente_id: this.pacienteId,
      registro_id: registro.id
    },
    state: { 
      pacienteData: this.paciente,
      registroData: registro
    }
  });
}

// Ver mediciones del paciente (glucosa y presión desde casa)
verMedicionesPaciente() {
  console.log('[MEDICIONES] Ver mediciones del paciente:', this.pacienteId);
  this.router.navigate(['/medicovermediciones'], { 
    queryParams: { paciente_id: this.pacienteId },
    state: { pacienteData: this.paciente }
  });
}

  // Volver a lista de pacientes
  volver() {
    this.router.navigate(['/medicoverpacientes']);
  }

  // Crear plan nutricional para este paciente
  crearPlanNutricional(paciente: any) {
    if (!this.pacienteId) {
      this.toastCtrl.create({ 
        message: 'No se puede crear el plan: paciente no identificado', 
        color: 'warning', 
        duration: 3000,
        position: 'bottom'
      }).then(t => t.present());
      return;
    }

    console.log('Creando plan para paciente:', paciente.id, paciente.nombres);
    
    this.router.navigate(['/medicocrearplan'], { 
      queryParams: { paciente_id: this.pacienteId },
      state: { 
        pacienteData: {
          id: paciente.id,
          nombre_completo: `${paciente.nombres} ${paciente.apellidos}`,
          edad: paciente.edad,
          sexo: paciente.sexo,
          actividad_fisica: paciente.actividad_fisica,
          ultimos_datos: this.ultimosDatos
        } 
      }
    });
  }

  // Refrescar datos
  async refrescarDatos() {
    try {
      if (this.pacienteId) {
        await this.cargarDetallePaciente();
        await this.toastCtrl.create({ 
          message: 'Datos actualizados', 
          color: 'success', 
          duration: 2000 
        }).then(t => t.present());
      }
    } catch (error) {
      console.error('Error refrescando datos:', error);
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