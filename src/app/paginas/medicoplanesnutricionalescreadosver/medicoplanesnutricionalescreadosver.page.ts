import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-medicoplanesnutricionalescreadosver',
  templateUrl: './medicoplanesnutricionalescreadosver.page.html',
  styleUrls: ['./medicoplanesnutricionalescreadosver.page.scss'],
  standalone: false,
})
export class MedicoplanesnutricionalescreadosverPage implements OnInit {

  //  Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombreDoctor: string = '';
  especialidad: string = '';

  //  Datos del plan
  plan: any = null;
  paciente: any = null;
  datosClinicos: any = null;
  cargando = true;
  error: string | null = null;

  //  Tabs
  tabActiva: string = 'resumen';

  private planId: string | null = null;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    this.cargarDatosUsuario();
    
    // Obtener planId de la ruta
    this.planId = this.activatedRoute.snapshot.paramMap.get('id');
    
    if (!this.planId) {
      this.error = 'No se especificó un plan para ver';
      this.cargando = false;
      return;
    }

    await this.cargarPlan();
  }

  //  Cargar datos del usuario
  private cargarDatosUsuario(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreDoctor = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Dr. Usuario';
        this.especialidad = user.rol === 'medico' ? 'Médico Especialista' : 'Nutricionista';
      } catch (e) {
        console.warn(' Error parseando usuario');
      }
    }
  }

  //  Cargar plan completo desde la API
  async cargarPlan(): Promise<void> {
    this.cargando = true;
    this.error = null;

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
        `${environment.apiUrl}/nutricionapp-api/medico/plan-nutricional/${this.planId}`,
        { headers }
      ).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje || 'Error al cargar el plan');
      }

      this.plan = response.plan;

      // Extraer datos clínicos del plan
      if (this.plan.datos_clinicos_base) {
        this.datosClinicos = this.plan.datos_clinicos_base;
      }

      // Cargar datos adicionales del paciente si es necesario
      if (this.plan.paciente_id) {
        await this.cargarDatosPaciente(this.plan.paciente_id);
      }

    } catch (error: any) {
      console.error(' Error cargando plan:', error);
      this.error = error?.message || 'Error al cargar el plan';
    } finally {
      this.cargando = false;
    }
  }

  //  Cargar datos adicionales del paciente
  private async cargarDatosPaciente(pacienteId: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/paciente/${pacienteId}/detalle`,
        { headers }
      ).toPromise();

      if (!response?.error && response?.paciente) {
        this.paciente = response.paciente;
      }
    } catch (error) {
      console.warn(' No se pudieron cargar datos adicionales del paciente');
    }
  }

  //  Color del badge según estado
  getBadgeColor(estado: string): string {
    const colores: Record<string, string> = {
      'activo': 'success',
      'borrador': 'medium',
      'completado': 'primary',
      'cancelado': 'danger'
    };
    return colores[estado] || 'medium';
  }

  //  Categoría IMC
  getIMCCategory(imc: number): string {
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Normal';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidad';
  }

  //  Categoría glucosa
  getGlucosaCategory(glucosa: number): string {
    if (glucosa < 100) return 'Normal';
    if (glucosa < 126) return 'Pre-diabetes';
    return 'Diabetes';
  }

  //  Categoría HbA1c
  getHbA1cCategory(hba1c: number): string {
    if (hba1c < 5.7) return 'Normal';
    if (hba1c < 6.5) return 'Pre-diabetes';
    return 'Diabetes';
  }

  //  Descripción actividad física
  getActividadDescripcion(actividad: string): string {
    const descripciones: Record<string, string> = {
      'sedentario': 'Poca o ninguna actividad física',
      'ligera': 'Ejercicio ligero 1-3 días/semana',
      'moderada': 'Ejercicio moderado 3-5 días/semana',
      'intensa': 'Ejercicio intenso 6-7 días/semana',
      'atleta': 'Entrenamiento muy intenso diario'
    };
    return descripciones[actividad?.toLowerCase()] || 'No especificada';
  }

  //  Icono por tipo de comida
  getMealIcon(mealType: string): string {
    const icons: Record<string, string> = {
      'desayuno': 'sunny-outline',
      'media_manana': 'cafe-outline',
      'almuerzo': 'restaurant-outline',
      'media_tarde': 'ice-cream-outline',
      'cena': 'moon-outline',
      'colacion': 'moon-outline'
    };
    return icons[mealType] || 'restaurant-outline';
  }

  //  Label por tipo de comida
  getMealLabel(mealType: string): string {
    const labels: Record<string, string> = {
      'desayuno': 'Desayuno',
      'media_manana': 'Media Mañana',
      'almuerzo': 'Almuerzo',
      'media_tarde': 'Media Tarde',
      'cena': 'Cena',
      'colacion': 'Colación'
    };
    return labels[mealType] || mealType;
  }

  //  Cambiar tab activa
  cambiarTab(): void {
    console.log(' Tab activa:', this.tabActiva);
  }

  //  Imprimir plan
  async imprimirPlan(): Promise<void> {
    window.print();
    await this.showToast(' Abriendo vista de impresión...', 'primary');
  }

  //  Descargar PDF
  async descargarPDF(): Promise<void> {
    await this.showToast(' Generando PDF... (Funcionalidad en desarrollo)', 'primary');
  }

  //  Volver
  volver(): void {
    this.router.navigate(['/medicoplanesnutricionalescreados']);
  }

  //  Navegación
  navegarA(ruta: string): void {
    this.sidebarOpen = false;
    
    const rutas: Record<string, string> = {
      'medico': '/medico',
      'medicoverpacientes': '/medicoverpacientes',
      'agregar-paciente': '/agregar-paciente',
      'buscar-paciente': '/buscar-paciente',
      'planes-nutricionales': '/medicoplanesnutricionalescreados',
      'seguimiento-clinico': '/seguimiento-clinico',
      'medicoinformes': '/medicoinformes',
      'configuracion': '/configuracion'
    };
    
    const destino = rutas[ruta] || '/medico';
    this.router.navigate([destino]);
  }

  //  Sidebar
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleSubmenu(item: string): void {
    this.submenuAbierto = this.submenuAbierto === item ? null : item;
  }

  //  Cerrar sesión
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
            this.showToast(' Sesión cerrada correctamente', 'primary');
          }
        }
      ]
    });
    await alert.present();
  }

  //  Toast
  async showToast(message: string, color: 'primary'|'success'|'danger'|'warning' = 'primary'): Promise<void> {
    await this.toastCtrl.create({
      message,
      color,
      duration: 3000,
      position: 'bottom'
    }).then(t => t.present());
  }
}