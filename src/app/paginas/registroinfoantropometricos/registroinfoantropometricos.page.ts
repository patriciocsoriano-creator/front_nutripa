import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoadingController, ToastController, Platform } from '@ionic/angular';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PatientRegistrationService } from 'src/app/services/registro-paciente';

// Interfaz para tipado seguro
interface AntropometriaForm {
  peso: number | null;
  talla: number | null;
  imc: number | null;
  circunferenciaCintura: number | null;
}

@Component({
  selector: 'app-registroinfoantropometricos',
  templateUrl: './registroinfoantropometricos.page.html',
  styleUrls: ['./registroinfoantropometricos.page.scss'],
  standalone: false,
})
export class RegistroinfoantropometricosPage implements OnInit, OnDestroy {

  // 👤 Info de usuario y Sidebar
  nombreAsistente: string = '';
  especialidad: string = '';
  
  // 🧭 Variables del Sidebar (Necesarias para el HTML)
  sidebarOpen = false;
  submenuAbierto: string | null = null; // 
  private isMobile = false;
  private destroy$ = new Subject<void>();

  // 📝 Formulario de Antropometría
  antropometriaForm: AntropometriaForm = {
    peso: null,
    talla: null,
    imc: null,
    circunferenciaCintura: null
  };

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private http: HttpClient,
    private patientService: PatientRegistrationService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private platform: Platform
  ) {
    // Detectar dispositivo
    this.platform.ready().then(() => {
      this.isMobile = this.platform.is('mobile') || this.platform.width() <= 1024;
      if (!this.isMobile) {
        this.sidebarOpen = true; // Sidebar abierto en PC
      }
    });

    // Cerrar sidebar en móvil al navegar
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isMobile && this.sidebarOpen) {
          this.sidebarOpen = false;
        }
      });
  }

  ngOnInit() {
    this.cargarDatosSesion();
    
    const registroId = this.activatedRoute.snapshot.queryParamMap.get('registro_id');
    if (registroId) {
      localStorage.setItem('registro_clinico_id', registroId);
    }
    
    this.cargarDatosGuardados();
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // Cargar sesión
  private cargarDatosSesion(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreAsistente = user.nombre || 'Enfermera';
        this.especialidad = user.rol === 'enfermera' ? 'Asistente Médico' : 
                           user.rol === 'nutricionista' ? 'Nutricionista' : 'Personal Médico';
      } catch (e) {
        console.warn('⚠️ Error parseando sesión:', e);
      }
    }
  }

  // Cargar datos previos si los hay
  private cargarDatosGuardados(): void {
    const datos = this.patientService.getAnthropometricData();
    if (datos) {
      this.antropometriaForm = { ...this.antropometriaForm, ...datos };
    }
  }

  // ==========================================
  // 🧭 MÉTODOS DEL SIDEBAR (NUEVOS)
  // ==========================================

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  // 👈 FALTABA ESTO: Abrir/cerrar submenú
  toggleSubmenu(menu: string): void {
    // Si ya está abierto, lo cierra. Si no, lo abre.
    this.submenuAbierto = this.submenuAbierto === menu ? null : menu;
  }

  irAInicio(): void {
    this.router.navigate(['/enfermeria']);
  }

  // ==========================================
  // 📏 LÓGICA DE CÁLCULO
  // ==========================================

  calcularIMC(): void {
    const { peso, talla } = this.antropometriaForm;
    if (peso !== null && talla !== null && talla > 0) {
      this.antropometriaForm.imc = Number((peso / (talla * talla)).toFixed(2));
    } else {
      this.antropometriaForm.imc = null;
    }
  }

  getClasificacionIMC(): string {
    const imc = this.antropometriaForm.imc;
    if (imc === null) return '';
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Normal';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidad';
  }

  // ==========================================
  // 💾 GUARDAR Y NAVEGAR
  // ==========================================

  async guardarYContinuar() {
    if (!this.antropometriaForm.peso || !this.antropometriaForm.talla) {
      await this.showToast('Peso y talla son obligatorios', 'danger');
      return;
    }

    // Validaciones de rango
    if (this.antropometriaForm.peso < 20 || this.antropometriaForm.peso > 300) {
      await this.showToast('Peso fuera de rango (20-300 kg)', 'warning');
      return;
    }
    if (this.antropometriaForm.talla < 0.5 || this.antropometriaForm.talla > 2.5) {
      await this.showToast('Talla fuera de rango (0.5-2.5 m)', 'warning');
      return;
    }

    this.calcularIMC();

    const loading = await this.loadingCtrl.create({ 
      message: 'Guardando medidas...', 
      spinner: 'crescent',
      cssClass: 'loading-custom' 
    });
    await loading.present();

    try {
      const registroId = localStorage.getItem('registro_clinico_id');
      const token = localStorage.getItem('token');

      // Guardar local
      this.patientService.setAnthropometricData(this.antropometriaForm);

      if (!registroId || !token) {
        await loading.dismiss();
        this.navegarSiguientePaso();
        return;
      }

      const response: any = await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/registro/${registroId}/antropometricos`,
        {
          peso: this.antropometriaForm.peso,
          talla: this.antropometriaForm.talla,
          circunferenciaCintura: this.antropometriaForm.circunferenciaCintura || null
        },
        { headers: this.getAuthHeaders() }
      ).toPromise();

      if (response?.error) throw new Error(response.mensaje);

      await loading.dismiss();
      await this.showToast(`✅ Datos guardados. IMC: ${this.antropometriaForm.imc}`, 'success');
      this.navegarSiguientePaso(registroId);

    } catch (error: any) {
      await loading.dismiss();
      console.error('❌ Error:', error);
      await this.showToast('⚠️ Guardado localmente.', 'warning');
      this.navegarSiguientePaso();
    }
  }

  private navegarSiguientePaso(registroId?: string): void {
    const id = registroId || localStorage.getItem('registro_clinico_id') || '';
    this.router.navigate(['/registroinfometabolicas'], { queryParams: { registro_id: id } });
  }

  volver(): void {
    this.router.navigate(['/registroinfosignosvitales']);
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` });
  }

  async showToast(message: string, color: string = 'primary', duration: number = 2500): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration, color, position: 'bottom', cssClass: 'toast-custom' });
    toast.present();
  }
}