import { Component, OnInit } from '@angular/core';
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

  // 👤 UI State
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombreDoctor: string = 'Dr. Usuario';
  especialidad: string = 'Especialista';

  // 📋 Data del paciente
  paciente: any = null;
  historial: any[] = [];
  ultimosDatos: any = null;
  cargando = false;
  errorCarga: string | null = null; //  manejo de errores
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
  
  //  Múltiples formas de obtener el paciente_id (debug incluido)
  console.log('🔍 [DEBUG] Snapshot params:', this.activatedRoute.snapshot.params);
  console.log('🔍 [DEBUG] Snapshot queryParams:', this.activatedRoute.snapshot.queryParams);
  
  // Opción 1: Route param (ej: /medicoconsultarpaciente/:id)
  const routeParam = this.activatedRoute.snapshot.paramMap.get('id') || 
                     this.activatedRoute.snapshot.paramMap.get('paciente_id');
  
  // Opción 2: Query param (ej: /medicoconsultarpaciente?paciente_id=XXX)
  const queryParam = this.activatedRoute.snapshot.queryParamMap.get('paciente_id') ||
                     this.activatedRoute.snapshot.queryParamMap.get('id');
  
  // Opción 3: Desde navigation state (pasado por router.navigate con state)
  const stateParam = this.router.getCurrentNavigation()?.extras?.state?.['paciente_id'] ||
                     this.router.getCurrentNavigation()?.extras?.state?.['id'];
  
  this.pacienteId = routeParam || queryParam || stateParam;
  
  console.log('🆔 [DEBUG] pacienteId obtenido:', this.pacienteId);
  
  if (this.pacienteId) {
    await this.cargarDetallePaciente();
  } else {
    this.errorCarga = 'No se especificó un paciente para consultar';
    console.warn('⚠️ No se pudo obtener el paciente_id de ninguna fuente');
  }
}

  // 👤 Cargar datos del médico desde localStorage
  private cargarDatosUsuario() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreDoctor = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Dr. Usuario';
        this.especialidad = user.rol || user.especialidad || 'Especialista';
      } catch (e) { 
        console.warn('⚠️ Error parseando usuario:', e); 
      }
    }
  }

  // 🔄 Cargar detalle del paciente desde API
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

      // Manejar respuesta de error del backend
      if (response?.error) {
        throw new Error(response.mensaje || 'Error en la respuesta del servidor');
      }
      
      // Validar que tengamos datos del paciente
      if (!response?.paciente) {
        throw new Error('No se encontró información del paciente');
      }
      
      // Asignar datos a las propiedades
      this.paciente = response.paciente;
      this.historial = response.historial || [];
      this.ultimosDatos = response.ultimos_datos || null;

    } catch (error: any) {
      console.error('❌ Error cargando paciente:', error);
      this.errorCarga = error.message || 'Error desconocido al cargar los datos';
      
      await this.toastCtrl.create({ 
        message: '⚠️ No se pudo cargar la información del paciente', 
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

  // 🔄 Alternar sidebar (expandir/colapsar)
  toggleSidebar() { 
    this.sidebarOpen = !this.sidebarOpen; 
  }

  // 🔄 Alternar submenú específico
  toggleSubmenu(item: string) { 
    this.submenuAbierto = this.submenuAbierto === item ? null : item; 
  }

  // 🧭 Navegar a otra página
  navegarA(ruta: string) {
    const rutas: Record<string, string> = {
      'principaldoctor': '/medico',
      'medicoverpacientes': '/medicoverpacientes',
      'agregar-paciente': '/agregar-paciente',
      'buscar-paciente': '/buscar-paciente',
      'planes-nutricionales': '/planes-nutricionales',
      'crear-plan': '/crear-plan',
      'medico-informes': '/medico-informes',
      'medico-configuracion': '/medico-configuracion'
    };
    const rutaDestino = rutas[ruta] || `/${ruta}`;
    this.router.navigate([rutaDestino]);
    this.submenuAbierto = null; // Cerrar submenú al navegar
  }

  // 🚪 Cerrar sesión
  async cerrarSesion() {
    // Limpiar datos de sesión
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

  // 🎨 Helpers para mostrar datos formateados
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
      'sedentario': '🪑 Sedentario',
      'ligera': '🚶 Ligera',
      'moderada': '🏃 Moderada',
      'intensa': '🔥 Intensa',
      'atleta': '🏅 Alto rendimiento'
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
    return condicion ? '✅ Sí' : '❌ No';
  }

  getBadgeColor(riesgo?: string): string {
    const colores: Record<string, string> = {
      'alto': 'danger',
      'medio': 'warning',
      'bajo': 'success'
    };
    return colores[riesgo || ''] || 'medium';
  }

  // 👁️ Ver detalle de un registro clínico
  verRegistro(registro: any) {
    console.log('🔍 Ver registro:', registro.id);
    this.toastCtrl.create({ 
      message: `Registro del ${new Date(registro.fecha_finalizacion).toLocaleDateString('es-EC')}`, 
      duration: 2000,
      position: 'bottom'
    }).then(t => t.present());
    
    // 👇 Aquí puedes navegar a una página de detalle si la creas:
    // this.router.navigate(['/detalle-registro', registro.id], { state: { registro } });
  }

  // 🔙 Volver a lista de pacientes
  volver() {
    this.router.navigate(['/medicoverpacientes']);
  }

  // 🥗 Crear plan nutricional para este paciente
  crearPlanNutricional(paciente: any) {
    if (!this.pacienteId) {
      this.toastCtrl.create({ 
        message: '⚠️ No se puede crear el plan: paciente no identificado', 
        color: 'warning', 
        duration: 3000,
        position: 'bottom'
      }).then(t => t.present());
      return;
    }

    console.log('🥗 Creando plan para paciente:', paciente.id, paciente.nombres);
    
    // Navegar a la página de creación de plan pasando el ID y datos del paciente
    this.router.navigate(['/medicocrearplan'], { 
      queryParams: { paciente_id: this.pacienteId },
      state: { 
        pacienteData: {
          id: paciente.id,
          nombre_completo: `${paciente.nombres} ${paciente.apellidos}`,
          edad: paciente.edad,
          sexo: paciente.sexo,
          actividad_fisica: paciente.actividad_fisica,
          // Incluir últimos datos clínicos si están disponibles
          ultimos_datos: this.ultimosDatos
        } 
      }
    });
  }

  // 🔄 Refrescar datos (para pull-to-refresh si lo agregas)
  async refrescarDatos(event?: any) {
    try {
      if (this.pacienteId) {
        await this.cargarDetallePaciente();
        await this.toastCtrl.create({ 
          message: 'Datos actualizados', 
          color: 'success', 
          duration: 2000 
        }).then(t => t.present());
      }
    } finally {
      if (event?.target?.complete) {
        event.target.complete();
      }
    }
  }
}