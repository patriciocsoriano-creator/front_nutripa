import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-enfermeriaverpacientes',
  templateUrl: './enfermeriaverpacientes.page.html',
  styleUrls: ['./enfermeriaverpacientes.page.scss'],
  standalone: false,
})
export class EnfermeriaverpacientesPage implements OnInit, OnDestroy {

  // 👤 Info de usuario para sidebar
  nombreAsistente: string = '';
  especialidad: string = '';
  usuario: any = null;
  
  // 🧭 Sidebar
  sidebarOpen = false;
  private isMobile = false;
  
  // 👥 Pacientes
  pacientes: any[] = [];
  pacientesFiltrados: any[] = [];
  cargandoPacientes = false;
  
  // 🔍 Búsqueda
  terminoBusqueda: string = '';
  
  // 📊 Filtros
  filtroEstado: string = 'todos';
  
  // 📄 Paginación
  paginaActual: number = 1;
  pacientesPorPagina: number = 10;
  totalPacientes: number = 0;
  
  // 🔐 Estados
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
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
    this.cargarPacientes();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter() {
    console.log('🔄 [VER PACIENTES] Recargando lista...');
    this.cargarPacientes();
  }

  // 👤 Cargar datos de sesión
  private cargarDatosSesion(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.usuario = JSON.parse(userStr);
        this.nombreAsistente = this.usuario.nombre || 'Enfermera';
        this.especialidad = this.usuario.rol === 'enfermera' ? 'Asistente Médico' : 
                           this.usuario.rol === 'nutricionista' ? 'Nutricionista' : 'Personal Médico';
      } catch (e) {
        console.warn('⚠️ Error parseando sesión:', e);
      }
    }
  }

  // 👥 Cargar todos los pacientes
  private async cargarPacientes(): Promise<void> {
    this.cargandoPacientes = true;
    
    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Usar endpoint para obtener TODOS los pacientes
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/pacientes/todos`,
        { headers }
      ).toPromise();

      if (response?.error === false && response?.pacientes) {
        this.pacientes = response.pacientes;
        this.totalPacientes = response.pacientes.length;
        this.aplicarFiltros();
        console.log('✅ [PACIENTES] Cargados:', this.pacientes.length);
      } else {
        this.pacientes = [];
        this.pacientesFiltrados = [];
      }
    } catch (error) {
      console.error('❌ Error cargando pacientes:', error);
      await this.showToast('Error al cargar pacientes', 'danger');
      this.pacientes = [];
      this.pacientesFiltrados = [];
    } finally {
      this.cargandoPacientes = false;
    }
  }

  // 🔍 Aplicar filtros y búsqueda
  aplicarFiltros(): void {
    let filtrados = [...this.pacientes];

    // Filtro por búsqueda
    if (this.terminoBusqueda.trim()) {
      const termino = this.terminoBusqueda.toLowerCase();
      filtrados = filtrados.filter(p => 
        p.nombre_completo?.toLowerCase().includes(termino) ||
        p.cedula?.includes(termino) ||
        p.telefono?.includes(termino)
      );
    }

    // Filtro por estado
    if (this.filtroEstado !== 'todos') {
      filtrados = filtrados.filter(p => p.estado_real === this.filtroEstado);
    }

    this.pacientesFiltrados = filtrados;
    this.paginaActual = 1; // Resetear paginación
  }

  // 📄 Paginación
  get pacientesPaginados(): any[] {
    const inicio = (this.paginaActual - 1) * this.pacientesPorPagina;
    const fin = inicio + this.pacientesPorPagina;
    return this.pacientesFiltrados.slice(inicio, fin);
  }

  get totalPaginas(): number {
    return Math.ceil(this.pacientesFiltrados.length / this.pacientesPorPagina);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  // 👁️ Ver información del paciente
  async verInformacion(paciente: any): Promise<void> {
    if (!paciente.registro_id) {
      await this.showToast('No se encontró registro del paciente', 'warning');
      return;
    }

    localStorage.setItem('registro_clinico_id', paciente.registro_id);

    if (paciente.estado_real === 'finalizado') {
      this.router.navigate(['/registrofinalizado'], {
        queryParams: { 
          registro_id: paciente.registro_id, 
          modo: 'lectura' 
        }
      });
    } else {
      this.router.navigate(['/enfermeriaverpacientesinfo'], {
        queryParams: { registro_id: paciente.registro_id }
      });
    }
  }

  // 🗑️ Eliminar paciente
  async eliminarPaciente(paciente: any): Promise<void> {
    const confirm = await this.alertCtrl.create({
      header: '⚠️ Eliminar Paciente',
      message: `¿Estás seguro de eliminar a <strong>${paciente.nombre_completo}</strong>?<br><br>
                <small style="color: #dc2626;">Esta acción no se puede deshacer. Todos los registros del paciente serán eliminados.</small>`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'Sí, eliminar',
          cssClass: 'alert-button-danger',
          handler: async () => {
            await this.confirmarEliminacion(paciente);
          }
        }
      ]
    });
    await confirm.present();
  }

  // Confirmar eliminación
  private async confirmarEliminacion(paciente: any): Promise<void> {
    const loading = await this.loadingCtrl.create({
      message: 'Eliminando paciente...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      const response: any = await this.http.delete(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/pacientes/${paciente.id}`,
        { headers }
      ).toPromise();

      await loading.dismiss();

      if (response?.error === false) {
        await this.showToast('✅ Paciente eliminado correctamente', 'success');
        await this.cargarPacientes(); // Recargar lista
      } else {
        throw new Error(response?.mensaje || 'Error desconocido');
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('❌ Error eliminando paciente:', error);
      await this.showToast('Error al eliminar paciente: ' + (error.message || 'Desconocido'), 'danger');
    }
  }

  // 📱 Contactar por WhatsApp
  async contactarWhatsApp(paciente: any): Promise<void> {
    if (!paciente.telefono) {
      await this.showToast('El paciente no tiene teléfono registrado', 'warning');
      return;
    }

    // Limpiar número de teléfono (solo dígitos)
    let telefono = paciente.telefono.replace(/\D/g, '');
    
    // Si es de Ecuador (10 dígitos), agregar código de país
    if (telefono.length === 10 && telefono.startsWith('0')) {
      telefono = '593' + telefono.substring(1);
    } else if (telefono.length === 10 && !telefono.startsWith('593')) {
      telefono = '593' + telefono;
    }

    // Mensaje predefinido
    const mensaje = encodeURIComponent(
      `Hola ${paciente.nombre_completo.split(' ')[0]}, soy ${this.nombreAsistente} del equipo médico de NutriPA. ¿En qué podemos ayudarte?`
    );

    // Abrir WhatsApp
    const url = `https://wa.me/${telefono}?text=${mensaje}`;
    window.open(url, '_blank');
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
      'alerta': 'danger'
    };
    return colores[estado] || 'medium';
  }

  // 🆕 Formatear estado
  formatearEstado(estado: string): string {
    const estados: Record<string, string> = {
      'finalizado': '✅ Completado',
      'en_proceso': '⏳ En proceso',
      'iniciado': '📝 Iniciado',
      'alerta': '⚠️ Con alerta'
    };
    return estados[estado] || estado;
  }

  // 🧭 Navegación
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  irAInicio(): void {
    this.router.navigate(['/enfermeria']);
  }

  irANuevoRegistro(): void {
    this.router.navigate(['/enfermeria']);
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
}