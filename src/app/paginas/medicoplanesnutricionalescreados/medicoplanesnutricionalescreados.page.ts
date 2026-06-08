import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

// 👇 Interfaz para tipado seguro
export interface PlanNutricionalResumen {
  id: string;
  paciente_id: string;
  paciente_nombre: string;
  paciente_identificacion: string;
  medico_id: string;
  perfil_recomendado: string;
  confianza_ia?: number;
  duracion_semanas: number;
  estado: 'borrador' | 'activo' | 'completado' | 'cancelado';
  fecha_creacion: string;
  fecha_vigencia_desde?: string;
  fecha_vigencia_hasta?: string;
}

@Component({
  selector: 'app-medicoplanesnutricionalescreados',
  templateUrl: './medicoplanesnutricionalescreados.page.html',
  styleUrls: ['./medicoplanesnutricionalescreados.page.scss'],
  standalone: false,
})
export class MedicoplanesnutricionalescreadosPage implements OnInit {

  // 👤 Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombreDoctor: string = '';
  especialidad: string = '';

  // 📋 Planes
  planes: PlanNutricionalResumen[] = [];
  planesFiltrados: PlanNutricionalResumen[] = [];
  cargando = true;

  // 🔍 Filtros
  searchTerm: string = '';
  filtroEstado: string = 'todos';
  ordenPor: string = 'fecha_desc';

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    this.cargarDatosUsuario();
    await this.cargarPlanes();
  }

  // 👤 Cargar datos del usuario
  private cargarDatosUsuario(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreDoctor = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Dr. Usuario';
        this.especialidad = user.rol === 'medico' ? 'Médico Especialista' : 'Nutricionista';
      } catch (e) {
        console.warn('⚠️ Error parseando usuario');
      }
    }
  }

  // 🔄 Cargar planes desde la API
  async cargarPlanes(): Promise<void> {
    this.cargando = true;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Sin autenticación');
      }

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      const response: any = await this.http.get(
  `${environment.apiUrl}/nutricionapp-api/medico/plan-nutricional/planes`,
  { headers }
).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje || 'Error al cargar planes');
      }

      // Transformar datos para la vista
      this.planes = (response.planes || []).map((plan: any) => ({
        id: plan.id,
        paciente_id: plan.paciente_id,
        paciente_nombre: `${plan.paciente_nombres || ''} ${plan.paciente_apellidos || ''}`.trim() || 'Sin nombre',
        paciente_identificacion: plan.paciente_identificacion || '-',
        medico_id: plan.medico_id,
        perfil_recomendado: plan.perfil_recomendado || 'Sin perfil',
        confianza_ia: plan.confianza_ia ? parseFloat(plan.confianza_ia) : null,
        duracion_semanas: plan.duracion_semanas || 4,
        estado: plan.estado || 'borrador',
        fecha_creacion: plan.fecha_creacion,
        fecha_vigencia_desde: plan.fecha_vigencia_desde,
        fecha_vigencia_hasta: plan.fecha_vigencia_hasta
      }));

      this.aplicarFiltros();

    } catch (error: any) {
      console.error('❌ Error cargando planes:', error);
      await this.showToast(error?.message || 'Error cargando planes. Intenta refrescar.', 'danger');
      this.planes = [];
      this.planesFiltrados = [];
    } finally {
      this.cargando = false;
    }
  }

  // 🔍 Aplicar filtros y ordenamiento
  private aplicarFiltros(): void {
    let filtrados = [...this.planes];

    // Filtro por búsqueda
    if (this.searchTerm?.trim()) {
      const termino = this.searchTerm.toLowerCase();
      filtrados = filtrados.filter(plan =>
        plan.paciente_nombre?.toLowerCase().includes(termino) ||
        plan.paciente_identificacion?.includes(termino) ||
        plan.perfil_recomendado?.toLowerCase().includes(termino)
      );
    }

    // Filtro por estado
    if (this.filtroEstado && this.filtroEstado !== 'todos') {
      filtrados = filtrados.filter(plan => plan.estado === this.filtroEstado);
    }

    // Ordenamiento
    switch (this.ordenPor) {
      case 'fecha_desc':
        filtrados.sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime());
        break;
      case 'fecha_asc':
        filtrados.sort((a, b) => new Date(a.fecha_creacion).getTime() - new Date(b.fecha_creacion).getTime());
        break;
      case 'paciente_asc':
        filtrados.sort((a, b) => a.paciente_nombre.localeCompare(b.paciente_nombre));
        break;
      case 'duracion_desc':
        filtrados.sort((a, b) => b.duracion_semanas - a.duracion_semanas);
        break;
    }

    this.planesFiltrados = filtrados;
  }

  filtrarPlanes(): void {
    this.aplicarFiltros();
  }

  // 👁️ Ver detalle del plan
  verPlan(plan: PlanNutricionalResumen): void {
    console.log('🔍 Ver plan:', plan.id);
    this.router.navigate(['/medicoplanesnutricionalescreadosver', plan.id], {
      state: {
        planId: plan.id,
        pacienteId: plan.paciente_id,
        pacienteNombre: plan.paciente_nombre
      }
    });
  }

  // 📄 Descargar plan como PDF
  async descargarPlan(plan: PlanNutricionalResumen): Promise<void> {
    await this.showToast('📄 Generando PDF... (Funcionalidad en desarrollo)', 'primary');
  }

  // ➕ Crear nuevo plan
  crearNuevoPlan(): void {
    this.router.navigate(['/medicocrearplan']);
  }

  // 🎨 Color del badge según estado
  getBadgeColor(estado: string): string {
    const colores: Record<string, string> = {
      'activo': 'success',
      'borrador': 'medium',
      'completado': 'primary',
      'cancelado': 'danger'
    };
    return colores[estado] || 'medium';
  }

  // 🧭 Navegación
  navegarA(ruta: string): void {
    this.sidebarOpen = false;
    
    const rutas: Record<string, string> = {
      'medico': '/medico',
      'medicoverpacientes': '/medicoverpacientes',
      'agregar-paciente': '/agregar-paciente',
      'buscar-paciente': '/buscar-paciente',
      'planes-nutricionales': '/medicoplanesnutricionalescreados',
      'medicoseguimientoclinico': '/medicoseguimientoclinico',
      'reportes': '/reportes',
      'configuracion': '/configuracion'
    };
    
    const destino = rutas[ruta] || '/medico';
    this.router.navigate([destino]);
  }

  // 🎛️ Sidebar
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleSubmenu(item: string): void {
    this.submenuAbierto = this.submenuAbierto === item ? null : item;
  }

  // 🚪 Cerrar sesión
  async cerrarSesion(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'secondary' },
        {
          text: 'Cerrar',
          handler: () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            this.router.navigate(['/principal'], { replaceUrl: true });
            this.showToast('👋 Sesión cerrada correctamente', 'primary');
          }
        }
      ]
    });
    await alert.present();
  }

  // 🔔 Toast
  async showToast(message: string, color: 'primary'|'success'|'danger'|'warning' = 'primary'): Promise<void> {
    await this.toastCtrl.create({
      message,
      color,
      duration: 3000,
      position: 'bottom'
    }).then(t => t.present());
  }
}