import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-enfermeriaverpacientesinfo',
  templateUrl: './enfermeriaverpacientesinfo.page.html',
  styleUrls: ['./enfermeriaverpacientesinfo.page.scss'],
  standalone: false,
})
export class EnfermeriaverpacientesinfoPage implements OnInit, OnDestroy {

  // 👤 Info de usuario para sidebar
  nombreAsistente: string = '';
  especialidad: string = '';
  
  // 🧭 Sidebar
  sidebarOpen = false;
  private isMobile = false;
  
  // 📋 Datos del paciente
  paciente: any = null;
  registro: any = null;
  datosPersonales: any = null;
  signosVitales: any = null;
  datosAntropometricos: any = null;
  condicionesMetabolicas: any = null;
  
  // 📊 Estado
  cargandoDatos = true;
  registroId: string = '';
  pacienteId: string = '';
  
  // 🔐 Estados
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private platform: Platform
  ) {
    this.platform.ready().then(() => {
      this.isMobile = this.platform.is('mobile') || this.platform.width() <= 1024;
      if (!this.isMobile) {
        this.sidebarOpen = true;
      }
    });
  }

  ngOnInit() {
    this.cargarDatosSesion();
    this.cargarDatosPaciente();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter() {
    this.cargarDatosPaciente();
  }

  // 👤 Cargar datos de sesión
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

  // 📋 Cargar datos completos del paciente
  private async cargarDatosPaciente(): Promise<void> {
    this.cargandoDatos = true;
    
    // Obtener IDs de queryParams
    this.registroId = this.activatedRoute.snapshot.queryParamMap.get('registro_id') || '';
    this.pacienteId = this.activatedRoute.snapshot.queryParamMap.get('paciente_id') || '';
    
    if (!this.registroId) {
      console.warn('⚠️ No hay registro_id');
      await this.showToast('No se encontró el registro', 'danger');
      this.router.navigate(['/enfermeriaverpacientes']);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Llamar al endpoint de estado del registro
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/registro/${this.registroId}/estado`,
        { headers }
      ).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      console.log('📥 [INFO PACIENTE] Datos recibidos:', response);

      // Asignar datos
      this.paciente = response.paciente;
      this.registro = response.registro;
      this.datosPersonales = response.datos?.datos_personales;
      this.signosVitales = response.datos?.signos_vitales;
      this.datosAntropometricos = response.datos?.datos_antropometricos;
      this.condicionesMetabolicas = response.datos?.condiciones_metabolicas;

      console.log('✅ [INFO PACIENTE] Datos cargados correctamente');

    } catch (error: any) {
      console.error('❌ Error cargando datos:', error);
      await this.showToast('Error al cargar información del paciente', 'danger');
    } finally {
      this.cargandoDatos = false;
    }
  }

  // 🧭 Navegación
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  irAInicio(): void {
    this.router.navigate(['/enfermeria']);
  }

  volverALista(): void {
    this.router.navigate(['/enfermeriaverpacientes']);
  }

  // 🆕 Obtener iniciales del nombre
  getIniciales(nombre: string): string {
    if (!nombre) return '?';
    const partes = nombre.trim().split(' ');
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  }

  // 🎨 Color del avatar
  getAvatarColor(nombre: string): string {
    const colores = [
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #fee140)',
      'linear-gradient(135deg, #30cfd0, #330867)'
    ];
    
    if (!nombre) return colores[0];
    
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) {
      hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colores[Math.abs(hash) % colores.length];
  }

  // 🎨 Color del badge según estado
  getEstadoColor(estado: string): string {
    const colores: Record<string, string> = {
      'finalizado': 'success',
      'en_proceso': 'warning',
      'iniciado': 'primary',
      'datos_personales': 'primary',
      'signos_vitales': 'warning',
      'antropometricos': 'warning',
      'metabolicas': 'success'
    };
    return colores[estado] || 'medium';
  }

  // 🆕 Formatear estado
  formatearEstado(estado: string): string {
    const estados: Record<string, string> = {
      'finalizado': '✅ Completado',
      'en_proceso': '⏳ En proceso',
      'iniciado': '📝 Iniciado',
      'datos_personales': '👤 Datos personales',
      'signos_vitales': '❤️ Signos vitales',
      'antropometricos': '📏 Antropométricos',
      'metabolicas': '🧬 Metabólicas'
    };
    return estados[estado] || estado;
  }

  // 📊 Calcular progreso
  getProgreso(): number {
    if (!this.registro) return 0;
    
    if (this.registro.estado === 'finalizado') return 100;
    
    let completados = 0;
    if (this.datosPersonales) completados++;
    if (this.signosVitales) completados++;
    if (this.datosAntropometricos) completados++;
    if (this.condicionesMetabolicas) completados++;
    
    return Math.round((completados / 4) * 100);
  }

  // 🎂 Calcular edad
  getEdad(): number | null {
    if (!this.paciente?.fecha_nacimiento) return null;
    
    const nacimiento = new Date(this.paciente.fecha_nacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    return edad >= 0 ? edad : null;
  }

  // 📱 Contactar por WhatsApp
  async contactarWhatsApp(): Promise<void> {
    if (!this.paciente?.telefono) {
      await this.showToast('El paciente no tiene teléfono registrado', 'warning');
      return;
    }

    let telefono = this.paciente.telefono.replace(/\D/g, '');
    
    if (telefono.length === 10 && telefono.startsWith('0')) {
      telefono = '593' + telefono.substring(1);
    } else if (telefono.length === 10 && !telefono.startsWith('593')) {
      telefono = '593' + telefono;
    }

    const mensaje = encodeURIComponent(
      `Hola ${this.paciente.nombres}, soy ${this.nombreAsistente} del equipo médico de NutriPA. ¿En qué podemos ayudarte?`
    );

    const url = `https://wa.me/${telefono}?text=${mensaje}`;
    window.open(url, '_blank');
  }

  // 🔔 Toast
  async showToast(message: string, color: string = 'primary', duration: number = 3000): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

   // 📅 Formatear fecha manualmente para evitar el bug de zona horaria (UTC-5)
  formatearFecha(fecha: string): string {
    if (!fecha) return 'No registrada';
    
    // Si viene en formato "YYYY-MM-DD", la dividimos manualmente
    if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) {
      const partes = fecha.substring(0, 10).split('-');
      return `${partes[2]}/${partes[1]}/${partes[0]}`; // Retorna dd/MM/yyyy
    }
    
    // Fallback por si viene en otro formato
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const anio = date.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }
}