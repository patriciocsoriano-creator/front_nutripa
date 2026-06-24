import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-enfermeria-reportes',
  templateUrl: './enfermeria-reportes.page.html',
  styleUrls: ['./enfermeria-reportes.page.scss'],
  standalone: false,
})
export class EnfermeriaReportesPage implements OnInit, OnDestroy {

  // Info de usuario
  nombreAsistente: string = 'Enfermera';
  especialidad: string = 'Asistente Medico';
  usuario: any = null;
  
  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  private isMobile = false;
  
  // Filtros
  fechaInicio: string = '';
  fechaFin: string = '';
  tipoRegistro: string = 'todos';
  periodoActivo: string = 'mes';
  
  // Datos
  estadisticas: any = {};
  registrosRecientes: any[] = [];
  cargando: boolean = false;
  
  // Estados
  private destroy$ = new Subject<void>();

  // Rutas
  private readonly rutas: Record<string, string> = {
    'enfermeria': '/enfermeria',
    'enfermeriaverpacientes': '/enfermeriaverpacientes',
    'enfermeria-buscar-paciente': '/enfermeria-buscar-paciente',
    'agregar-paciente': '/enfermeria/registro',
    'enfermeria-reportes': '/enfermeria-reportes',
    'enfermeria-configuracion': '/enfermeria-configuracion'
  };

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
      this.sidebarOpen = !this.isMobile;
    });
  }

  ngOnInit() {
    this.cargarDatosSesion();
    this.inicializarFechas();
    this.cargarInformes();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarDatosSesion(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.usuario = JSON.parse(userStr);
        this.nombreAsistente = this.usuario.nombre || 'Enfermera';
        this.especialidad = this.usuario.rol === 'enfermera' ? 'Asistente Medico' : 
                           this.usuario.rol === 'nutricionista' ? 'Nutricionista' : 'Personal Medico';
      } catch (e) {
        console.warn('Error parseando sesion:', e);
      }
    }
  }

  private inicializarFechas(): void {
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);

    this.fechaFin = hoy.toISOString().split('T')[0];
    this.fechaInicio = hace30Dias.toISOString().split('T')[0];
  }

  async cargarInformes(): Promise<void> {
    this.cargando = true;

    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      const params = new URLSearchParams();
      if (this.fechaInicio) params.append('fecha_inicio', this.fechaInicio);
      if (this.fechaFin) params.append('fecha_fin', this.fechaFin);
      if (this.tipoRegistro !== 'todos') params.append('estado', this.tipoRegistro);

      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/reportes/estadisticas?${params.toString()}`,
        { headers }
      ).toPromise();

      if (response?.error === false) {
        this.estadisticas = response.estadisticas || {};
        this.registrosRecientes = response.registros || [];
      } else {
        await this.showToast('Error al cargar informes', 'danger');
      }
    } catch (error) {
      console.error('Error cargando informes:', error);
      await this.showToast('Error de conexion', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  cambiarPeriodo(periodo: string): void {
    this.periodoActivo = periodo;
    const hoy = new Date();
    let fechaInicio = new Date();

    if (periodo === 'hoy') {
      fechaInicio = hoy;
    } else if (periodo === 'semana') {
      fechaInicio.setDate(hoy.getDate() - 7);
    } else if (periodo === 'mes') {
      fechaInicio.setDate(hoy.getDate() - 30);
    }

    this.fechaInicio = fechaInicio.toISOString().split('T')[0];
    this.fechaFin = hoy.toISOString().split('T')[0];
    this.aplicarFiltros();
  }

  async aplicarFiltros(): Promise<void> {
    await this.cargarInformes();
  }

  async exportarInforme(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Exportar informe',
      message: 'Selecciona el formato de exportacion:',
      buttons: [
        {
          text: 'PDF',
          handler: () => this.exportarEnFormato('pdf')
        },
        {
          text: 'Excel',
          handler: () => this.exportarEnFormato('excel')
        },
        {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });
    await alert.present();
  }

  private async exportarEnFormato(formato: string): Promise<void> {
    const loading = await this.loadingCtrl.create({
      message: 'Generando informe...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      const params = new URLSearchParams();
      if (this.fechaInicio) params.append('fecha_inicio', this.fechaInicio);
      if (this.fechaFin) params.append('fecha_fin', this.fechaFin);
      params.append('formato', formato);

      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/reportes/exportar?${params.toString()}`,
        { headers, responseType: 'blob' as any }
      ).toPromise();

      await loading.dismiss();

      const blob = new Blob([response], { type: formato === 'pdf' ? 'application/pdf' : 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `informe_enfermeria_${Date.now()}.${formato === 'excel' ? 'csv' : 'txt'}`;
      a.click();
      window.URL.revokeObjectURL(url);

      await this.showToast('Informe exportado correctamente', 'success');
    } catch (error) {
      await loading.dismiss();
      console.error('Error exportando informe:', error);
      await this.showToast('Error al exportar informe', 'danger');
    }
  }

  async verRegistro(registro: any): Promise<void> {
    if (!registro.id) {
      await this.showToast('No se encontro el registro', 'warning');
      return;
    }

    localStorage.setItem('registro_clinico_id', registro.id);

    if (registro.estado === 'finalizado') {
      this.router.navigate(['/registrofinalizado'], {
        queryParams: { registro_id: registro.id, modo: 'lectura' }
      });
    } else {
      this.router.navigate(['/enfermeriaverpacientesinfo'], {
        queryParams: { registro_id: registro.id }
      });
    }
  }

  async iniciarRegistroPaciente(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Nuevo Registro Clinico',
      message: 'Ingrese cedula, nombres y apellidos del paciente:',
      cssClass: 'alert-registro',
      inputs: [
        { name: 'cedula', type: 'tel', placeholder: 'Cedula (10 digitos)',
          attributes: { maxlength: 10, inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off' } },
        { name: 'nombres', type: 'text', placeholder: 'Nombres *' },
        { name: 'apellidos', type: 'text', placeholder: 'Apellidos *' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'alert-button-cancel' },
        {
          text: 'Iniciar Registro',
          cssClass: 'alert-button-confirm',
          handler: async (data: any) => {
            if (!data.cedula || !data.nombres || !data.apellidos) {
              await this.showToast('Complete cedula, nombres y apellidos', 'danger');
              return false;
            }
            const cedulaLimpia = data.cedula.replace(/\D/g, '');
            if (cedulaLimpia.length !== 10) {
              await this.showToast('La cedula debe tener 10 digitos', 'danger');
              return false;
            }
            if (!/^[a-zA-Z\s]+$/.test(data.nombres.trim()) || !/^[a-zA-Z\s]+$/.test(data.apellidos.trim())) {
              await this.showToast('Nombre y apellido solo deben contener letras', 'danger');
              return false;
            }
            await this.procesarInicioRegistro({
              cedula: cedulaLimpia,
              nombres: data.nombres.trim(),
              apellidos: data.apellidos.trim()
            });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private async procesarInicioRegistro(datos: any): Promise<void> {
    const loading = await this.loadingCtrl.create({ 
      message: 'Iniciando registro...', 
      spinner: 'crescent' 
    });
    await loading.present();

    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      const response: any = await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/registro/iniciar`,
        datos,
        { headers }
      ).toPromise();

      await loading.dismiss();

      if (response?.registro_id) {
        localStorage.setItem('registro_clinico_id', response.registro_id);
        await this.showToast('Registro iniciado correctamente', 'success');
        await this.router.navigate(['/registroinfopaciente'], { 
          queryParams: { 
            registro_id: response.registro_id,
            nombres: datos.nombres,
            apellidos: datos.apellidos,
            numeroIdentificacion: datos.cedula
          } 
        });
      } else {
        await this.showToast('Error: No se recibio ID de registro', 'danger');
      }
    } catch (error: any) {
      await loading.dismiss();
      await this.showToast(error?.error?.mensaje || 'Error de conexion', 'danger');
    }
  }

  getIniciales(nombre: string): string {
    if (!nombre) return '?';
    const partes = nombre.trim().split(' ');
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
    return nombre.substring(0, 2).toUpperCase();
  }

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

  getEstadoColor(estado: string): string {
    const colores: Record<string, string> = {
      'finalizado': 'success', 'en_proceso': 'warning',
      'iniciado': 'primary', 'alerta': 'danger'
    };
    return colores[estado] || 'medium';
  }

  getEstadoIcono(estado: string): string {
    const iconos: Record<string, string> = {
      'finalizado': 'checkmark-circle', 'en_proceso': 'create',
      'iniciado': 'time', 'alerta': 'warning'
    };
    return iconos[estado] || 'help-circle';
  }

  formatearEstado(estado: string): string {
    const estados: Record<string, string> = {
      'finalizado': 'Completado', 'en_proceso': 'En proceso',
      'iniciado': 'Iniciado', 'alerta': 'Con alerta'
    };
    return estados[estado] || estado;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleSubmenu(menu: string): void {
    this.submenuAbierto = this.submenuAbierto === menu ? null : menu;
  }

  navegarA(rutaKey: string): void {
    const ruta = this.rutas[rutaKey] || '/enfermeria';
    this.router.navigate([ruta]);
    if (this.isMobile) this.sidebarOpen = false;
  }

  async refrescarDatos(): Promise<void> {
    await this.cargarInformes();
    await this.showToast('Datos actualizados', 'success');
  }

  async cerrarSesion(): Promise<void> {
    const confirm = await this.alertCtrl.create({
      header: 'Cerrar sesion',
      message: 'Esta seguro que desea cerrar sesion?',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'alert-button-cancel' },
        {
          text: 'Si, cerrar',
          cssClass: 'alert-button-confirm',
          handler: async () => {
            localStorage.clear();
            await this.showToast('Sesion cerrada exitosamente', 'success');
            this.router.navigate(['/principal'], { replaceUrl: true });
          }
        }
      ]
    });
    await confirm.present();
  }

  async showToast(message: string, color: string = 'primary', duration: number = 3000): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration, color, position: 'bottom' });
    await toast.present();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-item-with-submenu')) {
      this.submenuAbierto = null;
    }
  }
}