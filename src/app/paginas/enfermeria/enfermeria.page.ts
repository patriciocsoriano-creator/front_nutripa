import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoadingController, ToastController, AlertController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { filter } from 'rxjs/operators';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-enfermeria',
  templateUrl: './enfermeria.page.html',
  styleUrls: ['./enfermeria.page.scss'],
  standalone: false,
})
export class EnfermeriaPage implements OnInit, OnDestroy {

  // 👤 INFO DE USUARIO
  nombreAsistente: string = 'Enfermera';
  especialidad: string = 'Asistente Médico';
  usuario: { id: string; nombre: string; rol: string } | null = null;
  
  // 🧭 SIDEBAR
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  private isMobile = false;
  
  // 📊 ESTADÍSTICAS
  totalPacientes: number = 0;
  registrosMes: number = 0;
  alertasActivas: number = 0;
  citasHoy: number = 0;
  detalleAlertas: any[] = [];
  
  // 👥 PACIENTES
  pacientesRecientes: any[] = [];
  cargandoPacientes = false;
  
  // 🔐 ESTADOS
  cargando = false;
  private destroy$ = new Subject<void>();
  
  // 🗺️ RUTAS
  private readonly rutas: Record<string, string> = {
    'enfermeria': '/enfermeria',
    'medicoverpacientes': '/enfermeria/pacientes',
    'enfermeriaverpacientes': '/enfermeriaverpacientes', 
    'agregar-paciente': '/enfermeria/registro',
    'buscar-paciente': '/enfermeria/buscar',
    'reportes': '/enfermeria/reportes',
    'signos-vitales': '/enfermeria/signos-vitales'
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private platform: Platform
  ) {
    this.platform.ready().then(() => {
      this.isMobile = this.platform.is('mobile') || this.platform.width() <= 1024;
      if (!this.isMobile) {
        this.sidebarOpen = true;
      } else {
        this.sidebarOpen = false;
      }
    });
    
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isMobile && this.sidebarOpen) this.sidebarOpen = false;
      });
  }

  async ngOnInit() {
    const sesionValida = await this.verificarSesion();
    if (!sesionValida) return;
  }

  ionViewWillEnter() {
    console.log('🔄 [ENFERMERIA] Recargando panel...');
    this.cargarTodoElPanel();
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 🔐 Verificar sesión
  private async verificarSesion(): Promise<boolean> {
    const token = localStorage.getItem('token');
    const usuarioStr = localStorage.getItem('user');

    if (!token || !usuarioStr) {
      this.router.navigate(['/principal'], { replaceUrl: true });
      return false;
    }

    try {
      const datos = JSON.parse(usuarioStr);
      if (!datos?.nombre || !datos?.id) throw new Error('Datos inválidos');
      
      const rolPermitido = ['enfermera', 'nutricionista', 'admin'].includes(datos.rol?.toLowerCase());
      if (!rolPermitido) {
        this.router.navigate(['/principal'], { replaceUrl: true });
        return false;
      }
      
      this.usuario = datos;
      this.nombreAsistente = datos.nombre;
      this.especialidad = datos.especialidad || 'Asistente Médico';
      return true;
      
    } catch (e) {
      localStorage.clear();
      this.router.navigate(['/principal'], { replaceUrl: true });
      return false;
    }
  }

  // 📊 Cargar panel completo
  private async cargarTodoElPanel(): Promise<void> {
    this.cargando = true;
    
    try {
      await Promise.all([
        this.cargarEstadisticas(),
        this.cargarPacientesRecientes()
      ]);
    } catch (error) {
      console.error('❌ Error cargando panel:', error);
    } finally {
      this.cargando = false;
    }
  }

  // 📈 Estadísticas
  private async cargarEstadisticas(): Promise<void> {
  const token = localStorage.getItem('token');
  
  // Solo verificar token, NO requerir this.usuario
  if (!token) {
    console.warn('[ESTADISTICAS] No hay token, reintentando en 500ms...');
    setTimeout(() => this.cargarEstadisticas(), 500);
    return;
  }

  try {
    console.log('[ESTADISTICAS] Llamando al endpoint...');
    
    const response: any = await this.http.get(
      `${environment.apiUrl}/nutricionapp-api/enfermeria/estadisticas`,
      { headers: this.getAuthHeaders() }
    ).toPromise();

    console.log('[ESTADISTICAS] Respuesta recibida:', response);

    if (response?.error === false) {
      const datos = response.datos || response;
      
      this.totalPacientes = datos.total_pacientes || 0;
      this.citasHoy = datos.registros_hoy || 0;
      this.registrosMes = datos.registros_mes || 0;
      this.alertasActivas = datos.alertas_activas || 0;
      
      console.log('[ESTADISTICAS] Datos asignados:', {
        totalPacientes: this.totalPacientes,
        citasHoy: this.citasHoy,
        registrosMes: this.registrosMes,
        alertasActivas: this.alertasActivas
      });
    }
  } catch (error) {
    console.error('[ESTADISTICAS] Error:', error);
  }
}
  
  // 👥 Pacientes recientes
  private async cargarPacientesRecientes(): Promise<void> {
    this.cargandoPacientes = true;
    
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/pacientes/recientes?limit=6`,
        { headers: this.getAuthHeaders() }
      ).toPromise();
      
      if (response?.error === false && response?.pacientes) {
        this.pacientesRecientes = response.pacientes.map((p: any) => ({
          id: p.id,
          nombre_completo: p.nombre_completo || 'Paciente',
          telefono: p.telefono || null,
          cedula: p.cedula || null,
          estado_real: p.estado_real || 'iniciado',
          progreso: p.progreso || 0,
          alertas: p.alertas || [],
          tiene_alerta: p.tiene_alerta || false,
          registro_id: p.registro_id,
          ultima_fecha: p.ultima_fecha
        }));
      }
    } catch (error) {
      console.error('❌ Error cargando pacientes:', error);
      this.pacientesRecientes = [];
    } finally {
      this.cargandoPacientes = false;
    }
  }

  // 🆕 Continuar registro existente
  async continuarRegistro(paciente: any): Promise<void> {
    if (!paciente.registro_id) {
      this.showToast('No se encontró el ID del registro', 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Cargando registro...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/registro/${paciente.registro_id}/estado`,
        { headers: this.getAuthHeaders() }
      ).toPromise();

      await loading.dismiss();

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      localStorage.setItem('registro_clinico_id', paciente.registro_id);

      const siguientePaso = response.siguientePaso;
      console.log(`🧭 [SMART NAV] Redirigiendo a: ${siguientePaso}`);

      const queryParams: any = { registro_id: paciente.registro_id };
      
      if (siguientePaso === 'registroinfopaciente' && response.paciente) {
        queryParams.nombres = response.paciente.nombres;
        queryParams.apellidos = response.paciente.apellidos;
        queryParams.numeroIdentificacion = response.paciente.numero_identificacion;
        queryParams.fechaNacimiento = response.paciente.fecha_nacimiento || '';
        queryParams.sexo = response.paciente.sexo || '';
        queryParams.telefono = response.paciente.telefono || '';
        queryParams.direccion = response.paciente.direccion || '';
        queryParams.ocupacion = response.paciente.ocupacion || '';
        queryParams.actividadFisica = response.paciente.actividad_fisica || '';
      }

      this.router.navigate([`/${siguientePaso}`], { queryParams });

    } catch (error: any) {
      await loading.dismiss();
      console.error('❌ Error en navegación inteligente:', error);
      this.showToast('Error cargando el registro', 'danger');
    }
  }

  // 👁️ Ver detalle de paciente
  async verDetallePaciente(paciente: any): Promise<void> {
    if (!paciente.registro_id) {
      this.showToast('No se encontró el registro', 'danger');
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
      return;
    }

    await this.continuarRegistro(paciente);
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

  // 🆕 Color del avatar basado en el nombre
  getAvatarColor(nombre: string): string {
    const colores = [
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #fee140)',
      'linear-gradient(135deg, #30cfd0, #330867)',
      'linear-gradient(135deg, #a8edea, #fed6e3)',
      'linear-gradient(135deg, #ff9a9e, #fecfef)'
    ];
    
    if (!nombre) return colores[0];
    
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) {
      hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colores[Math.abs(hash) % colores.length];
  }

  // 🆕 Color del badge según estado real
  getEstadoColor(estado: string): string {
    const colores: Record<string, string> = {
      'finalizado': 'success',
      'en_proceso': 'warning',
      'iniciado': 'primary',
      'alerta': 'danger'
    };
    return colores[estado] || 'medium';
  }

  // 🆕 Icono según estado real
  getEstadoIcono(estado: string): string {
    const iconos: Record<string, string> = {
      'finalizado': 'checkmark-circle',
      'en_proceso': 'create',
      'iniciado': 'time',
      'alerta': 'warning'
    };
    return iconos[estado] || 'help-circle';
  }

  // 🆕 Formatear estado real para mostrar
  formatearEstadoReal(estado: string): string {
    const estados: Record<string, string> = {
      'finalizado': 'Completado',
      'en_proceso': 'En proceso',
      'iniciado': 'Iniciado',
      'alerta': 'Con alerta'
    };
    return estados[estado] || estado;
  }
  
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // 🧭 Navegación y UI
  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }
  
  toggleSubmenu(menu: string): void {
    this.submenuAbierto = this.submenuAbierto === menu ? null : menu;
  }
  
  navegarA(rutaKey: string): void {
    const ruta = this.rutas[rutaKey] || '/enfermeria';
    this.router.navigate([ruta]);
    if (this.isMobile && this.sidebarOpen) this.sidebarOpen = false;
  }
  
  private async iniciarRegistroParaPacienteExistente(paciente: any): Promise<void> {
    const confirm = await this.alertCtrl.create({
      header: 'Nuevo Registro Clínico',
      message: `¿Deseas iniciar un nuevo registro para <strong>${paciente.nombre_completo}</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Iniciar Registro',
          handler: async () => {
            try {
              const response: any = await this.http.post(
                `${environment.apiUrl}/nutricionapp-api/enfermeria/registro/iniciar`,
                { 
                  cedula: paciente.cedula, 
                  nombres: paciente.nombre_completo?.split(' ')[0] || '', 
                  apellidos: paciente.nombre_completo?.split(' ').slice(1).join(' ') || '' 
                },
                { headers: this.getAuthHeaders() }
              ).toPromise();
              
              if (response?.registro_id) {
                localStorage.setItem('registro_clinico_id', response.registro_id);
                
                // 🆕 NUEVA CITA: Pasar flag y datos del paciente
                const queryParams: any = { 
                  registro_id: response.registro_id,
                  nueva_cita: 'true',
                  paciente_existente: 'true'
                };
                
                // Pre-llenar con datos del paciente existente
                if (paciente.nombre_completo) {
                  const partes = paciente.nombre_completo.split(' ');
                  queryParams.nombres = partes[0] || '';
                  queryParams.apellidos = partes.slice(1).join(' ') || '';
                }
                queryParams.numeroIdentificacion = paciente.cedula;
                
                this.router.navigate(['/registroinfopaciente'], { queryParams });
              }
            } catch (error) {
              await this.showToast('Error iniciando registro', 'danger');
            }
          }
        }
      ]
    });
    await confirm.present();
  }

  // 🚀 Iniciar nuevo registro clínico
  async iniciarRegistroPaciente(): Promise<void> {
    console.log('🔍 [DEBUG] Abriendo alert de registro...');
    
    const alert = await this.alertCtrl.create({
      header: '📋 Nuevo Registro Clínico',
      message: 'Ingrese cédula, nombres y apellidos del paciente:',
      cssClass: 'alert-registro',
      
      inputs: [
        { 
          name: 'cedula', 
          type: 'tel',
          placeholder: 'Cédula (10 dígitos)', 
          attributes: { 
            maxlength: 10, 
            inputmode: 'numeric', 
            pattern: '[0-9]*',
            autocomplete: 'off'
          } 
        },
        { name: 'nombres', type: 'text', placeholder: 'Nombres *' },
        { name: 'apellidos', type: 'text', placeholder: 'Apellidos *' }
      ],
      
      buttons: [
        { 
          text: 'Cancelar', 
          role: 'cancel', 
          cssClass: 'alert-button-cancel',
          handler: () => console.log('❌ [DEBUG] Usuario canceló')
        },
        {
          text: 'Iniciar Registro',
          cssClass: 'alert-button-confirm',
          handler: async (data: any) => {
            console.log('📥 [DEBUG] Datos recibidos:', data);
            
            if (!data.cedula || !data.nombres || !data.apellidos) {
              console.log('⚠️ [DEBUG] Campos incompletos');
              await this.showToast('Complete cédula, nombres y apellidos', 'danger');
              return false;
            }
            
            const cedulaLimpia = data.cedula.replace(/\D/g, '');
            console.log('🔢 [DEBUG] Cédula limpia:', cedulaLimpia);
            
            const validacion = this.validarCedulaEcuador(cedulaLimpia);
            console.log('✅ [DEBUG] Resultado validación:', validacion);
            
            if (!validacion.valido) {
              console.log('❌ [DEBUG] Cédula inválida:', validacion.mensaje);
              await this.mostrarErrorCedula(validacion.mensaje);
              console.log('🔄 [DEBUG] Retornando false para mantener alert abierto');
              return false;
            }
            
            if (!/^[a-zA-Z\s]+$/.test(data.nombres.trim())) {
              await this.showToast('El nombre solo debe contener letras', 'danger');
              return false;
            }
            
            if (!/^[a-zA-Z\s]+$/.test(data.apellidos.trim())) {
              await this.showToast('El apellido solo debe contener letras', 'danger');
              return false;
            }
            
            console.log('✅ [DEBUG] Todo válido, procesando registro...');
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
    console.log('✅ [DEBUG] Alert principal presentado');
    
    setTimeout(() => {
      const inputCedula = document.querySelector('ion-alert input[name="cedula"]') as HTMLInputElement;
      if (inputCedula) {
        inputCedula.focus();
        console.log('🎯 [DEBUG] Focus en input cédula');
      }
    }, 300);
  }
  
  // ✅ CORREGIDO: procesarInicioRegistro con detección de paciente existente
  private async procesarInicioRegistro(datos: any): Promise<void> {
    const loading = await this.loadingCtrl.create({ 
      message: 'Buscando paciente...', 
      spinner: 'crescent' 
    });
    await loading.present();

    try {
      // 🆕 PASO 1: Buscar si el paciente ya existe en el sistema
      let pacienteExistente = null;
      try {
        const busquedaResponse: any = await this.http.get(
          `${environment.apiUrl}/nutricionapp-api/enfermeria/pacientes/buscar/${datos.cedula}`,
          { headers: this.getAuthHeaders() }
        ).toPromise();
        
        if (busquedaResponse?.paciente) {
          pacienteExistente = busquedaResponse.paciente;
          console.log('✅ [NUEVA CITA] Paciente existente encontrado:', pacienteExistente.nombre_completo);
        }
      } catch (error) {
        console.log('ℹ️ [NUEVA CITA] Paciente no encontrado en registros previos');
      }

      // 🆕 PASO 2: Iniciar nuevo registro clínico
      const response: any = await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/enfermeria/registro/iniciar`,
        datos,
        { headers: this.getAuthHeaders() }
      ).toPromise();

      if (response?.registro_id) {
        localStorage.setItem('registro_clinico_id', response.registro_id);
        
        console.log('🚀 [DEBUG] Navegando a registroinfopaciente con ID:', response.registro_id);
        
        // 🆕 PASO 3: Construir queryParams con información de nueva cita
        const queryParams: any = { 
          registro_id: response.registro_id
        };
        
        // Si el paciente ya existe, marcar como nueva cita
        if (pacienteExistente) {
          queryParams.nueva_cita = 'true';
          queryParams.paciente_existente = 'true';
          
          // Pre-llenar con datos del paciente existente
          if (pacienteExistente.nombre_completo) {
            const partes = pacienteExistente.nombre_completo.split(' ');
            queryParams.nombres = partes[0] || datos.nombres;
            queryParams.apellidos = partes.slice(1).join(' ') || datos.apellidos;
          } else {
            queryParams.nombres = datos.nombres;
            queryParams.apellidos = datos.apellidos;
          }
          queryParams.numeroIdentificacion = pacienteExistente.cedula || datos.cedula;
          
          await this.showToast('✅ Paciente encontrado. Iniciando nueva cita...', 'success');
        } else {
          // Paciente nuevo
          queryParams.nombres = datos.nombres;
          queryParams.apellidos = datos.apellidos;
          queryParams.numeroIdentificacion = datos.cedula;
          
          await this.showToast('✅ Registro iniciado correctamente', 'success');
        }
        
        await this.router.navigate(['/registroinfopaciente'], { queryParams });
      } else {
        await this.showToast('Error: No se recibió ID de registro', 'danger');
      }
    } catch (error: any) {
      console.error('❌ [ERROR] En procesarInicioRegistro:', error);
      
      if (error?.status === 409 && error?.error?.registro_id) {
        await loading.dismiss();
        const backendError = error.error;
        const confirm = await this.alertCtrl.create({
          header: 'Registro existente',
          message: `El paciente <strong>${datos.nombres} ${datos.apellidos}</strong> ya tiene un registro en progreso.`,
          buttons: [
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Continuar',
              handler: () => {
                localStorage.setItem('registro_clinico_id', backendError.registro_id);
                this.router.navigate(['/registroinfopaciente'], {
                  queryParams: { registro_id: backendError.registro_id }
                });
              }
            }
          ]
        });
        await confirm.present();
        return;
      }
      await this.showToast(error?.error?.mensaje || 'Error de conexión', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // 🔐 Cerrar sesión
  async cerrarSesion(): Promise<void> {
    const confirm = await this.alertCtrl.create({
      header: 'Cerrar sesión',
      message: '¿Está seguro que desea cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, cerrar',
          handler: () => {
            localStorage.clear();
            this.router.navigate(['/principal'], { replaceUrl: true, queryParams: { loggedOut: 'true' } });
          }
        }
      ]
    });
    await confirm.present();
  }

  // 🔔 Toast notifications
  async showToast(message: string, color: 'success'|'danger'|'warning'|'primary' = 'primary', duration = 3000): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration, color, position: 'bottom' });
    await toast.present();
  }

  // 🎨 Ver detalle de alertas
  async verDetalleAlertas(): Promise<void> {
    if (this.detalleAlertas.length === 0) {
      await this.showToast('No hay alertas activas', 'primary');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: '🚨 Alertas Activas',
      cssClass: 'alert-alertas',
      message: `
        <div style="max-height: 400px; overflow-y: auto;">
          ${this.detalleAlertas.map(a => `
            <div style="padding: 10px; margin-bottom: 8px; background: ${a.nivel === 'critico' ? '#fee2e2' : a.nivel === 'alto' ? '#fef3c7' : '#dbeafe'}; border-radius: 8px; border-left: 4px solid ${a.nivel === 'critico' ? '#dc2626' : a.nivel === 'alto' ? '#f59e0b' : '#3b82f6'};">
              <strong>${a.nombre_completo}</strong><br>
              <small>Cédula: ${a.cedula}</small><br>
              <small style="color: #6c7293;">⚠️ ${a.tipo_alerta}</small><br>
              <small style="color: #9499b7;">📅 ${new Date(a.fecha).toLocaleDateString('es-EC')}</small>
            </div>
          `).join('')}
        </div>
      `,
      buttons: ['Cerrar']
    });
    await alert.present();
  }

  // 🎨 Helpers para badges
  getBadgeColor(estado: string): string {
    const colores: Record<string, string> = {
      'iniciado': 'primary',
      'datos_personales': 'primary',
      'signos_vitales': 'warning',
      'antropometricos': 'warning',
      'metabolicas': 'success',
      'finalizado': 'success',
      'cancelado': 'danger'
    };
    return colores[estado] || 'medium';
  }

  formatearEstado(estado: string): string {
    const estados: Record<string, string> = {
      'iniciado': '📝 Iniciado',
      'datos_personales': '👤 Datos',
      'signos_vitales': '❤️ Signos',
      'antropometricos': '📏 Antropo',
      'metabolicas': '🧬 Metabólicas',
      'finalizado': '✅ Finalizado',
      'cancelado': '❌ Cancelado'
    };
    return estados[estado] || estado;
  }

  // 🆔 VALIDACIÓN DE CÉDULA ECUATORIANA
  private validarCedulaEcuador(cedula: string): { valido: boolean; mensaje: string } {
    if (!/^\d{10}$/.test(cedula)) {
      return { 
        valido: false, 
        mensaje: cedula.length < 10 
          ? `Faltan ${10 - cedula.length} dígito(s)` 
          : 'La cédula no puede tener más de 10 dígitos' 
      };
    }
    
    const provincia = parseInt(cedula.substring(0, 2), 10);
    const provinciasValidas = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24];
    if (!provinciasValidas.includes(provincia)) {
      return { 
        valido: false, 
        mensaje: `Código de provincia '${cedula.substring(0,2)}' no válido para Ecuador.` 
      };
    }
    
    const tercerDigito = parseInt(cedula[2], 10);
    if (tercerDigito < 0 || tercerDigito > 6) {
      if (tercerDigito === 9) {
        return { valido: false, mensaje: 'Cédula de persona jurídica no permitida' };
      }
      return { valido: false, mensaje: 'Tercer dígito de cédula no válido' };
    }
    
    const digitos = cedula.split('').map(d => parseInt(d, 10));
    const ultimoDigito = digitos[9];
    
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      let valor = digitos[i];
      if (i % 2 === 0) {
        valor *= 2;
        if (valor > 9) valor -= 9;
      }
      suma += valor;
    }
    
    const digitoVerificador = (10 - (suma % 10)) % 10;
    
    if (digitoVerificador !== ultimoDigito) {
      return { 
        valido: false, 
        mensaje: 'Cédula inválida: dígito verificador incorrecto.' 
      };
    }
    
    return { valido: true, mensaje: '' };
  }

  private async mostrarErrorCedula(mensaje: string): Promise<void> {
    const errorAlert = await this.alertCtrl.create({
      header: '⚠️ Cédula Inválida',
      message: mensaje,
      cssClass: 'alert-error-cedula',
      buttons: [{ 
        text: 'Entendido', 
        role: 'cancel'
      }]
    });
    
    await errorAlert.present();
    await errorAlert.onDidDismiss();
  }
}