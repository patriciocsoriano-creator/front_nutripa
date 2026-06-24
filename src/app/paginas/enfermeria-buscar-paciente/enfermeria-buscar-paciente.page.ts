import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-enfermeria-buscar-paciente',
  templateUrl: './enfermeria-buscar-paciente.page.html',
  styleUrls: ['./enfermeria-buscar-paciente.page.scss'],
  standalone: false,
})
export class EnfermeriaBuscarPacientePage implements OnInit, OnDestroy {

  // Info de usuario
  nombreAsistente: string = 'Enfermera';
  especialidad: string = 'Asistente Medico';
  usuario: any = null;
  
  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  private isMobile = false;
  
  // Busqueda
  terminoBusqueda: string = '';
  tipoBusqueda: string = 'todos';
  filtroEstado: string = 'todos';
  ordenPor: string = 'recientes';
  
  // Resultados
  resultados: any[] = [];
  buscando: boolean = false;
  haBuscado: boolean = false;
  
  // Busquedas recientes
  busquedasRecientes: string[] = [];
  
  // Estados
  private destroy$ = new Subject<void>();

  // Rutas
  private readonly rutas: Record<string, string> = {
    'enfermeria': '/enfermeria',
    'enfermeriaverpacientes': '/enfermeriaverpacientes',
    'enfermeria-buscar-paciente': '/enfermeria-buscar-paciente',
    'agregar-paciente': '/enfermeria/registro',
    'reportes': '/enfermeria/reportes',
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
    this.cargarBusquedasRecientes();
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

  private cargarBusquedasRecientes(): void {
    const busquedas = localStorage.getItem('busquedas_recientes_enfermeria');
    if (busquedas) {
      try {
        this.busquedasRecientes = JSON.parse(busquedas);
      } catch (e) {
        this.busquedasRecientes = [];
      }
    }
  }

  private guardarBusquedaReciente(termino: string): void {
    if (!termino.trim()) return;
    
    // Eliminar duplicados
    this.busquedasRecientes = this.busquedasRecientes.filter(b => b !== termino);
    
    // Agregar al inicio
    this.busquedasRecientes.unshift(termino);
    
    // Limitar a 5 busquedas
    if (this.busquedasRecientes.length > 5) {
      this.busquedasRecientes = this.busquedasRecientes.slice(0, 5);
    }
    
    localStorage.setItem('busquedas_recientes_enfermeria', JSON.stringify(this.busquedasRecientes));
  }

  async buscarPacientes(): Promise<void> {
    if (!this.terminoBusqueda.trim()) {
      await this.showToast('Ingrese un termino de busqueda', 'warning');
      return;
    }

    this.buscando = true;
    this.haBuscado = true;
    this.guardarBusquedaReciente(this.terminoBusqueda.trim());

    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      const params = new URLSearchParams();
      params.append('q', this.terminoBusqueda.trim());
      params.append('tipo', this.tipoBusqueda);
      params.append('estado', this.filtroEstado);
      params.append('orden', this.ordenPor);

      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/pacientes/buscar?${params.toString()}`,
        { headers }
      ).toPromise();

      if (response?.error === false) {
        this.resultados = response.pacientes || [];
        
        if (this.resultados.length === 0) {
          await this.showToast('No se encontraron pacientes', 'primary');
        } else {
          await this.showToast(`${this.resultados.length} paciente(s) encontrado(s)`, 'success');
        }
      } else {
        this.resultados = [];
        await this.showToast('Error en la busqueda', 'danger');
      }
    } catch (error) {
      console.error('Error buscando pacientes:', error);
      this.resultados = [];
      await this.showToast('Error al buscar pacientes', 'danger');
    } finally {
      this.buscando = false;
    }
  }

  ejecutarBusquedaRapida(termino: string): void {
    this.terminoBusqueda = termino;
    this.buscarPacientes();
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.resultados = [];
    this.haBuscado = false;
    this.tipoBusqueda = 'todos';
    this.filtroEstado = 'todos';
  }

  async verInformacion(paciente: any): Promise<void> {
    if (!paciente.registro_id) {
      await this.showToast('No se encontro registro del paciente', 'warning');
      return;
    }

    localStorage.setItem('registro_clinico_id', paciente.registro_id);

    if (paciente.estado_real === 'finalizado') {
      this.router.navigate(['/registrofinalizado'], {
        queryParams: { registro_id: paciente.registro_id, modo: 'lectura' }
      });
    } else {
      this.router.navigate(['/enfermeriaverpacientesinfo'], {
        queryParams: { registro_id: paciente.registro_id }
      });
    }
  }

  async contactarWhatsApp(paciente: any): Promise<void> {
    if (!paciente.telefono) {
      await this.showToast('El paciente no tiene telefono registrado', 'warning');
      return;
    }

    let telefono = paciente.telefono.replace(/\D/g, '');
    
    if (telefono.length === 10 && telefono.startsWith('0')) {
      telefono = '593' + telefono.substring(1);
    } else if (telefono.length === 10 && !telefono.startsWith('593')) {
      telefono = '593' + telefono;
    }

    const mensaje = encodeURIComponent(
      `Hola ${paciente.nombre_completo.split(' ')[0]}, soy ${this.nombreAsistente} del equipo medico de NutriPA.`
    );

    window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank');
  }

  async nuevoRegistroParaPaciente(paciente: any): Promise<void> {
    const confirm = await this.alertCtrl.create({
      header: 'Nuevo Registro',
      message: `Desea iniciar un nuevo registro para <strong>${paciente.nombre_completo}</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'alert-button-cancel' },
        {
          text: 'Iniciar',
          cssClass: 'alert-button-confirm',
          handler: async () => {
            try {
              const token = localStorage.getItem('token');
              const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              });

              const partes = paciente.nombre_completo.split(' ');
              const response: any = await this.http.post(
                `${environment.apiUrl}/nutricionapp-api/enfermeria/registro/iniciar`,
                {
                  cedula: paciente.cedula,
                  nombres: partes[0] || '',
                  apellidos: partes.slice(1).join(' ') || ''
                },
                { headers }
              ).toPromise();

              if (response?.registro_id) {
                localStorage.setItem('registro_clinico_id', response.registro_id);
                await this.showToast('Registro iniciado correctamente', 'success');
                this.router.navigate(['/registroinfopaciente'], {
                  queryParams: {
                    registro_id: response.registro_id,
                    nombres: partes[0] || '',
                    apellidos: partes.slice(1).join(' ') || '',
                    numeroIdentificacion: paciente.cedula
                  }
                });
              }
            } catch (error: any) {
              if (error?.status === 409 && error?.error?.registro_id) {
                localStorage.setItem('registro_clinico_id', error.error.registro_id);
                this.router.navigate(['/registroinfopaciente'], {
                  queryParams: { registro_id: error.error.registro_id }
                });
              } else {
                await this.showToast('Error al iniciar registro', 'danger');
              }
            }
          }
        }
      ]
    });
    await confirm.present();
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
    if (this.haBuscado && this.terminoBusqueda) {
      await this.buscarPacientes();
    }
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