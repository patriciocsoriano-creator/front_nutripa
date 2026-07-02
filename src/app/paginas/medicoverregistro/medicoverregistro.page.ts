import { Component, HostListener, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoadingController, ToastController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-medicoverregistro',
  templateUrl: './medicoverregistro.page.html',
  styleUrls: ['./medicoverregistro.page.scss'],
  standalone: false,
})
export class MedicoverregistroPage implements OnInit {

  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombreDoctor: string = 'Dr. Usuario';
  especialidad: string = 'Especialista';

  registro: any = null;
  paciente: any = null;
  cargando = false;
  errorCarga: string | null = null;
  pacienteId: string | null = null;
  registroId: string | null = null;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    this.cargarDatosUsuario();
    
    // Obtener IDs de query params
    this.pacienteId = this.activatedRoute.snapshot.queryParamMap.get('paciente_id');
    this.registroId = this.activatedRoute.snapshot.queryParamMap.get('registro_id');
    
    console.log('[DEBUG] pacienteId:', this.pacienteId);
    console.log('[DEBUG] registroId:', this.registroId);
    
    if (this.pacienteId && this.registroId) {
      await this.cargarDetalleRegistro();
    } else {
      this.errorCarga = 'No se especificó el paciente o el registro';
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

  async cargarDetalleRegistro() {
    if (!this.pacienteId || !this.registroId) return;
    
    this.cargando = true;
    this.errorCarga = null;
    
    const loading = await this.loadingCtrl.create({ 
      message: 'Cargando registro...', 
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticación');

      const url = `${environment.apiUrl}/nutricionapp-api/medico/paciente/${this.pacienteId}/registro/${this.registroId}`;
      
      const response: any = await this.http.get(url, {
        headers: new HttpHeaders({ 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        })
      }).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje || 'Error en la respuesta');
      }
      
      if (!response?.registro) {
        throw new Error('No se encontró el registro');
      }
      
      this.registro = response.registro;
      this.paciente = response.paciente || null;

    } catch (error: any) {
      console.error('Error cargando registro:', error);
      this.errorCarga = error.message || 'Error desconocido';
      
      await this.toastCtrl.create({ 
        message: 'No se pudo cargar el registro', 
        color: 'danger', 
        duration: 3500, 
        position: 'bottom'
      }).then(t => t.present());
      
    } finally {
      await loading.dismiss();
      this.cargando = false;
    }
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

  getSexoLabel(sexo: string): string {
    const map: Record<string, string> = { 
      'M': 'Masculino', 
      'F': 'Femenino', 
      'O': 'Otro' 
    };
    return map[sexo] || 'No especificado';
  }

  getIMCLabel(imc: number): string {
    if (!imc) return 'N/A';
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Normal';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidad';
  }

  getActividadFisicaLabel(actividad: string): string {
  const map: Record<string, string> = {
    'sedentario': 'Sedentario',
    'ligera': 'Ligera',
    'moderada': 'Moderada',
    'intensa': 'Intensa',
    'atleta': 'Alto rendimiento'
  };
  return map[actividad] || 'No registrada';
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