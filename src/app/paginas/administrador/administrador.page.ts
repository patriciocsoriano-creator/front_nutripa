import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController, ActionSheetController } from '@ionic/angular';

// ========================================
// 📦 INTERFACES PARA TIPADO SEGURO
// ========================================

export interface Usuario {
  usuario_id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  rol: 'paciente' | 'medico' | 'enfermera' | 'asistente' | 'admin';
  detalle_rol?: string;
  estado: boolean;
  avatar?: string;
  fecha_registro: string;
  ultimo_acceso?: string;
}

export interface Paciente {
  paciente_id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  tipo_diabetes?: '1' | '2' | 'Gestacional';
  estado: 'activo' | 'inactivo';
}

export interface AsistenteMedico {
  asistente_id: string;
  usuario_id: string;
  nombre: string;
  apellido: string;
  email: string;
  especialidad: string;
  medico_id: string;
  medico_nombre: string;
  medico_apellido: string;
  fecha_contratacion: string;
  salario?: number;
  estado: boolean;
}

export interface Medico {
  nutricionista_id: string;
  nombre: string;
  apellido: string;
  especialidad: string;
  email: string;
  pacientes_asignados: number;
}

export interface AsignacionPaciente {
  asignacion_id: string;
  paciente_id: string;
  paciente_nombre: string;
  paciente_apellido: string;
  asistente_id: string;
  asistente_nombre: string;
  asistente_apellido: string;
  medico_id: string;
  medico_nombre: string;
  medico_apellido: string;
  fecha_asignacion: string;
  estado: 'activo' | 'inactivo';
}

export interface ActividadReciente {
  id: string;
  usuario: string;
  avatar?: string;
  accion: string;
  tipo: 'login' | 'registro' | 'actualizacion' | 'alerta';
  fecha: string;
}

export interface AlertaSistema {
  id: string;
  titulo: string;
  mensaje: string;
  icono: string;
  critica: boolean;
  fecha: string;
  leida: boolean;
}

export interface VariableClinica {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: 'glucosa' | 'presion' | 'peso' | 'imc' | 'colesterol' | 'otro';
  rango_minimo: number;
  rango_maximo: number;
  rango_optimo_min: number;
  rango_optimo_max: number;
  unidad: string;
  activo: boolean;
}

export interface ConfigAlerta {
  id: string;
  nombre: string;
  descripcion: string;
  severidad: 'baja' | 'media' | 'alta' | 'critica';
  activa: boolean;
  umbral: number;
  notificar_paciente: boolean;
  notificar_medico: boolean;
}

export interface PlantillaPlan {
  id: string;
  nombre: string;
  descripcion: string;
  calorias_diarias: number;
  carbohidratos: number;
  proteinas: number;
  grasas: number;
  uso: number;
  fecha_creacion: string;
}

export interface ReporteMedico {
  id: string;
  titulo: string;
  descripcion: string;
  fecha_generacion: string;
  estado: 'pendiente' | 'generando' | 'completado' | 'error';
  tipo: 'evolucion' | 'alertas' | 'cumplimiento';
}

export interface LogSistema {
  id: string;
  modulo: string;
  mensaje: string;
  tipo: 'info' | 'warning' | 'error' | 'success';
  fecha: string;
  usuario: string;
}

export interface BackupSistema {
  id: string;
  fecha: string;
  tamano: string;
  tipo: 'completo' | 'incremental';
  estado: 'exitoso' | 'fallido';
}

export interface EstadisticasDashboard {
  totalUsuarios: number;
  pacientesActivos: number;
  medicosActivos: number;
  usuariosInactivos: number;
  notificacionesNoLeidas: number;
}

export interface MetricasIA {
  precision: number;
  recall: number;
  f1_score: number;
  precision_diabetes: number;
  precision_nutricion: number;
  predicciones_totales: number;
  predicciones_exitosas: number;
  tasa_error: number;
  tiempo_promedio: number;
}

export interface ActividadPorRol {
  rol: string;
  sesiones: number;
  tiempo_promedio: string;
  crecimiento: number;
}

export interface ContratoActivo {
  id: string;
  nombre: string;
  apellido: string;
  puesto: string;
  especialidad: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activo' | 'por_vencer' | 'vencido';
  dias_restantes: number;
}

// ========================================
// 🎯 COMPONENTE PRINCIPAL
// ========================================

@Component({
  selector: 'app-administrador',
  templateUrl: './administrador.page.html',          
  styleUrls: ['./administrador.page.scss'],
  standalone: false,
})

export class AdministradorPage implements OnInit {

  // 👤 Usuario actual (simulado - reemplazar con AuthService)
  usuarioActual: any = {
    usuario_id: 'ADM001',
    nombre: 'Carlos',
    apellido: 'Administrador',
    email: 'admin@hospital.com',
    rol: 'admin',
    avatar: 'assets/icon/admin-avatar.png'
  };

  // 🎛️ Estado de la UI
  sidebarCollapsed: boolean = false;
  moduloActivo: string = 'dashboard';
  tituloModulo: string = 'Dashboard';
  descripcionModulo: string = 'Vista general del sistema';
  terminoBusqueda: string = '';
  segmentValue: string = 'pendientes';

  // 🔍 Filtros
  tipoUsuario: string = 'todos';

  // 📊 Estadísticas del Dashboard
  estadisticas: EstadisticasDashboard = {
    totalUsuarios: 0,
    pacientesActivos: 0,
    medicosActivos: 0,
    usuariosInactivos: 0,
    notificacionesNoLeidas: 0
  };

  // 📈 Métricas de IA
  metricasIA: MetricasIA = {
    precision: 0.94,
    recall: 0.91,
    f1_score: 0.92,
    precision_diabetes: 0.96,
    precision_nutricion: 0.89,
    predicciones_totales: 15847,
    predicciones_exitosas: 14523,
    tasa_error: 0.084,
    tiempo_promedio: 245
  };

  // 📋 Datos de Usuarios
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];

  // 👥 Datos para Asignaciones
  pacientesDisponibles: Paciente[] = [];
  asistentesRegistrados: AsistenteMedico[] = [];
  nutricionistas: Medico[] = [];
  asignacionesActivas: AsignacionPaciente[] = [];

  // 🎯 Selección para asignación
  pacienteSeleccionado: Paciente | null = null;
  asistenteSeleccionado: AsistenteMedico | null = null;
  medicoSeleccionado: Medico | null = null;

  // 🏥 Datos para Registro de Asistentes
  enfermerasPendientes: Usuario[] = [];
  enfermeraSeleccionada: Usuario | null = null;
  nutricionistaSeleccionado: Medico | null = null;
  especialidad: string = '';
  fechaContrato: string = '';
  salario: number | null = null;

  // ⚙️ Configuración Red Neuronal
  configRedNeuronal: any = {
    activo: true,
    modelo: 'diabetes_v1',
    tasa_aprendizaje: 0.01,
    epocas: 100,
    precision_minima: 0.90
  };

  // 🩺 Variables Clínicas
  variablesClinicas: VariableClinica[] = [];

  // 🔔 Configuración de Alertas
  configAlertas: ConfigAlerta[] = [];

  // 🥗 Configuración de Planes Nutricionales
  plantillasPlanes: PlantillaPlan[] = [];
  configPlanes: any = {
    calorias_maximas: 2500,
    carbohidratos_maximos: 300,
    aprobar_automaticamente: false
  };

  // 📊 Reportes
  reportesUso: any = {
    usuarios_activos: 0,
    nuevos_registros: 0,
    planes_generados: 0,
    alertas_generadas: 0
  };
  actividadPorRol: ActividadPorRol[] = [];
  reportesMedicos: ReporteMedico[] = [];

  // 🪵 Logs del Sistema
  logsSistema: LogSistema[] = [];

  // 💾 Backup & Restore
  ultimoBackup: string = '';
  tamanoBaseDatos: number = 0;
  configBackup: any = { automatico: true };
  backupsDisponibles: BackupSistema[] = [];
  backupSeleccionado: BackupSistema | null = null;

  // 📋 Datos auxiliares
  actividadReciente: ActividadReciente[] = [];
  alertasSistema: AlertaSistema[] = [];

  constructor(
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private actionSheetCtrl: ActionSheetController
  ) { }

  // ========================================
  // 🔄 INICIALIZACIÓN
  // ========================================

  async ngOnInit() {
    await this.cargarDatosIniciales();
    this.actualizarTituloModulo();
  }

  async cargarDatosIniciales(): Promise<void> {
    const loading = await this.loadingCtrl.create({
      message: 'Cargando panel de administración...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // 👇 Simulación de carga de datos (REEMPLAZAR CON LLAMADAS A API)
      await this.cargarEstadisticas();
      await this.cargarUsuarios();
      await this.cargarDatosAsignaciones();
      await this.cargarVariablesClinicas();
      await this.cargarConfigAlertas();
      await this.cargarPlantillasPlanes();
      await this.cargarReportes();
      await this.cargarLogsSistema();
      await this.cargarBackups();

      await this.showToast('Panel cargado exitosamente', 'success');
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      await this.showToast('Error cargando datos. Algunas funciones pueden estar limitadas.', 'warning');
    } finally {
      await loading.dismiss();
    }
  }

  // ========================================
  // 🎛️ NAVEGACIÓN Y UI
  // ========================================

  // 🔄 Alternar sidebar (colapsar/expandir)
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  // 🧭 Cambiar módulo activo
  cambiarModulo(modulo: string): void {
    this.moduloActivo = modulo;
    this.actualizarTituloModulo();
    
    // Cargar datos específicos del módulo si es necesario
    if (modulo === 'usuarios') {
      this.filtrarUsuarios();
    } else if (modulo === 'asignacion-pacientes') {
      this.cargarDatosAsignaciones();
    } else if (modulo === 'registros') {
      this.cargarEnfermerasPendientes();
    }
  }

  // 📝 Actualizar título y descripción según módulo
  private actualizarTituloModulo(): void {
    const modulos: Record<string, { titulo: string; descripcion: string }> = {
      'dashboard': {
        titulo: 'Dashboard',
        descripcion: 'Vista general del sistema y métricas clave'
      },
      'usuarios': {
        titulo: 'Gestión de Usuarios',
        descripcion: 'Administrar pacientes, médicos y personal del sistema'
      },
      'asignacion-pacientes': {
        titulo: 'Asignación de Pacientes',
        descripcion: 'Asignar pacientes a asistentes médicos y nutricionistas'
      },
      'registros': {
        titulo: 'Registros Especiales',
        descripcion: 'Gestionar enfermeras, asistentes y contratos'
      },
      'red-neuronal': {
        titulo: 'Configuración de Red Neuronal',
        descripcion: 'Ajustar parámetros del modelo de IA predictivo'
      },
      'variables': {
        titulo: 'Variables Clínicas',
        descripcion: 'Configurar rangos y parámetros de salud'
      },
      'alertas': {
        titulo: 'Sistema de Alertas',
        descripcion: 'Configurar umbrales y notificaciones automáticas'
      },
      'planes': {
        titulo: 'Planes Nutricionales',
        descripcion: 'Administrar plantillas y configuración de planes'
      },
      'reportes-uso': {
        titulo: 'Reportes de Uso',
        descripcion: 'Análisis de actividad y adopción de la plataforma'
      },
      'reportes-ia': {
        titulo: 'Efectividad de la IA',
        descripcion: 'Métricas de precisión y rendimiento del modelo'
      },
      'reportes-medicos': {
        titulo: 'Reportes Médicos',
        descripcion: 'Generar y gestionar informes clínicos'
      },
      'logs': {
        titulo: 'Logs del Sistema',
        descripcion: 'Monitoreo de eventos y errores del sistema'
      },
      'backup': {
        titulo: 'Backup & Restore',
        descripcion: 'Gestionar copias de seguridad y recuperación'
      }
    };

    const moduloInfo = modulos[this.moduloActivo];
    if (moduloInfo) {
      this.tituloModulo = moduloInfo.titulo;
      this.descripcionModulo = moduloInfo.descripcion;
    }
  }

  // 🔍 Filtrar datos según búsqueda
  filtrarDatos(): void {
    if (this.moduloActivo === 'usuarios') {
      this.filtrarUsuarios();
    }
    // Agregar filtros para otros módulos según sea necesario
  }

  // ========================================
  // 📊 CARGA DE DATOS (MOCK - REEMPLAZAR CON API)
  // ========================================

  async cargarEstadisticas(): Promise<void> {
    // 👇 Datos mock - Reemplazar con: const data = await this.adminService.getDashboardStats();
    this.estadisticas = {
      totalUsuarios: 1247,
      pacientesActivos: 892,
      medicosActivos: 45,
      usuariosInactivos: 123,
      notificacionesNoLeidas: 7
    };

    this.reportesUso = {
      usuarios_activos: 856,
      nuevos_registros: 34,
      planes_generados: 1523,
      alertas_generadas: 89
    };

    this.actividadPorRol = [
      { rol: 'paciente', sesiones: 4521, tiempo_promedio: '12m 34s', crecimiento: 15 },
      { rol: 'medico', sesiones: 892, tiempo_promedio: '28m 12s', crecimiento: 8 },
      { rol: 'enfermera', sesiones: 1247, tiempo_promedio: '18m 45s', crecimiento: 22 },
      { rol: 'admin', sesiones: 156, tiempo_promedio: '45m 20s', crecimiento: 3 }
    ];
  }

  async cargarUsuarios(): Promise<void> {
    // 👇 Datos mock de usuarios
    this.usuarios = [
      {
        usuario_id: 'PAC001',
        nombre: 'María',
        apellido: 'González',
        email: 'maria.gonzalez@email.com',
        telefono: '0998765432',
        rol: 'paciente',
        estado: true,
        fecha_registro: '2026-01-15T10:30:00Z',
        ultimo_acceso: '2026-04-22T14:20:00Z'
      },
      {
        usuario_id: 'MED001',
        nombre: 'Dr. Juan',
        apellido: 'Pérez',
        email: 'juan.perez@hospital.com',
        telefono: '0987654321',
        rol: 'medico',
        detalle_rol: 'Endocrinología',
        estado: true,
        fecha_registro: '2025-06-10T08:00:00Z',
        ultimo_acceso: '2026-04-23T09:15:00Z'
      },
      {
        usuario_id: 'ENF001',
        nombre: 'Ana',
        apellido: 'López',
        email: 'ana.lopez@hospital.com',
        telefono: '0976543210',
        rol: 'enfermera',
        estado: true,
        fecha_registro: '2026-03-01T12:00:00Z'
      },
      {
        usuario_id: 'PAC002',
        nombre: 'Carlos',
        apellido: 'Martínez',
        email: 'carlos.martinez@email.com',
        telefono: '0965432109',
        rol: 'paciente',
        estado: false,
        fecha_registro: '2025-11-20T16:45:00Z',
        ultimo_acceso: '2026-02-10T11:30:00Z'
      }
    ];

    this.filtrarUsuarios();
  }

  filtrarUsuarios(): void {
    let filtrados = [...this.usuarios];

    // Filtro por término de búsqueda
    if (this.terminoBusqueda) {
      const termino = this.terminoBusqueda.toLowerCase();
      filtrados = filtrados.filter(u =>
        u.nombre.toLowerCase().includes(termino) ||
        u.apellido.toLowerCase().includes(termino) ||
        u.email.toLowerCase().includes(termino)
      );
    }

    // Filtro por tipo de usuario
    if (this.tipoUsuario !== 'todos') {
      const rolMap: Record<string, string> = {
        'pacientes': 'paciente',
        'medicos': 'medico',
        'asistentes': 'enfermera',
        'admins': 'admin'
      };
      const rolFiltro = rolMap[this.tipoUsuario];
      if (rolFiltro) {
        filtrados = filtrados.filter(u => u.rol === rolFiltro);
      }
    }

    this.usuariosFiltrados = filtrados;
  }

  cambiarTipoUsuario(event: any): void {
    this.tipoUsuario = event.detail.value;
    this.filtrarUsuarios();
  }

  async cargarDatosAsignaciones(): Promise<void> {
    // 👇 Mock data para asignaciones
    this.pacientesDisponibles = [
      { paciente_id: 'PAC101', nombre: 'Laura', apellido: 'Sánchez', telefono: '0991234567', tipo_diabetes: '2', estado: 'activo' },
      { paciente_id: 'PAC102', nombre: 'Roberto', apellido: 'Díaz', telefono: '0992345678', tipo_diabetes: '1', estado: 'activo' },
      { paciente_id: 'PAC103', nombre: 'Carmen', apellido: 'Ruiz', telefono: '0993456789', tipo_diabetes: 'Gestacional', estado: 'activo' }
    ];

    this.asistentesRegistrados = [
      {
        asistente_id: 'ASIST001',
        usuario_id: 'ENF001',
        nombre: 'Ana',
        apellido: 'López',
        email: 'ana.lopez@hospital.com',
        especialidad: 'Enfermería General',
        medico_id: 'MED001',
        medico_nombre: 'Juan',
        medico_apellido: 'Pérez',
        fecha_contratacion: '2026-03-01',
        estado: true
      }
    ];

    this.nutricionistas = [
      { nutricionista_id: 'MED001', nombre: 'Juan', apellido: 'Pérez', especialidad: 'Endocrinología', email: 'juan.perez@hospital.com', pacientes_asignados: 23 },
      { nutricionista_id: 'MED002', nombre: 'Laura', apellido: 'Méndez', especialidad: 'Nutrición Clínica', email: 'laura.mendez@hospital.com', pacientes_asignados: 18 }
    ];

    this.asignacionesActivas = [
      {
        asignacion_id: 'ASG001',
        paciente_id: 'PAC050',
        paciente_nombre: 'Pedro',
        paciente_apellido: 'Gómez',
        asistente_id: 'ASIST001',
        asistente_nombre: 'Ana',
        asistente_apellido: 'López',
        medico_id: 'MED001',
        medico_nombre: 'Juan',
        medico_apellido: 'Pérez',
        fecha_asignacion: '2026-04-01T10:00:00Z',
        estado: 'activo'
      }
    ];
  }

  async cargarEnfermerasPendientes(): Promise<void> {
    // 👇 Mock: enfermeras sin asignar
    this.enfermerasPendientes = this.usuarios.filter(u => u.rol === 'enfermera' && u.estado);
  }

  async cargarVariablesClinicas(): Promise<void> {
    this.variablesClinicas = [
      {
        id: 'VAR001',
        nombre: 'Glucosa en Ayunas',
        descripcion: 'Nivel de glucosa sanguínea después de 8 horas de ayuno',
        tipo: 'glucosa',
        rango_minimo: 70,
        rango_maximo: 100,
        rango_optimo_min: 80,
        rango_optimo_max: 90,
        unidad: 'mg/dL',
        activo: true
      },
      {
        id: 'VAR002',
        nombre: 'Presión Arterial Sistólica',
        descripcion: 'Presión máxima en las arterias durante el latido cardíaco',
        tipo: 'presion',
        rango_minimo: 90,
        rango_maximo: 140,
        rango_optimo_min: 110,
        rango_optimo_max: 120,
        unidad: 'mmHg',
        activo: true
      },
      {
        id: 'VAR003',
        nombre: 'Índice de Masa Corporal (IMC)',
        descripcion: 'Relación peso/talla para evaluar estado nutricional',
        tipo: 'imc',
        rango_minimo: 18.5,
        rango_maximo: 40,
        rango_optimo_min: 18.5,
        rango_optimo_max: 24.9,
        unidad: 'kg/m²',
        activo: true
      }
    ];
  }

  async cargarConfigAlertas(): Promise<void> {
    this.configAlertas = [
      {
        id: 'ALT001',
        nombre: 'Glucosa Elevada',
        descripcion: 'Alertar cuando glucosa en ayunas > 126 mg/dL',
        severidad: 'alta',
        activa: true,
        umbral: 126,
        notificar_paciente: true,
        notificar_medico: true
      },
      {
        id: 'ALT002',
        nombre: 'Presión Arterial Crítica',
        descripcion: 'Alertar cuando PA sistólica > 180 mmHg',
        severidad: 'critica',
        activa: true,
        umbral: 180,
        notificar_paciente: true,
        notificar_medico: true
      },
      {
        id: 'ALT003',
        nombre: 'Peso Estancado',
        descripcion: 'Alertar si no hay cambio de peso en 4 semanas',
        severidad: 'media',
        activa: false,
        umbral: 4,
        notificar_paciente: true,
        notificar_medico: false
      }
    ];
  }

  async cargarPlantillasPlanes(): Promise<void> {
    this.plantillasPlanes = [
      {
        id: 'PLAN001',
        nombre: 'Diabetes Tipo 2 - Control',
        descripcion: 'Plan balanceado para control glucémico',
        calorias_diarias: 1800,
        carbohidratos: 180,
        proteinas: 90,
        grasas: 60,
        uso: 234,
        fecha_creacion: '2026-01-10'
      },
      {
        id: 'PLAN002',
        nombre: 'Pérdida de Peso Moderada',
        descripcion: 'Déficit calórico sostenible para pérdida gradual',
        calorias_diarias: 1500,
        carbohidratos: 150,
        proteinas: 100,
        grasas: 50,
        uso: 189,
        fecha_creacion: '2026-02-15'
      }
    ];
  }

  async cargarReportes(): Promise<void> {
    this.reportesMedicos = [
      {
        id: 'REP001',
        titulo: 'Evolución Trimestral - Pacientes Diabetes Tipo 2',
        descripcion: 'Análisis de progreso en control glucémico Q1 2026',
        fecha_generacion: '2026-04-01T09:00:00Z',
        estado: 'completado',
        tipo: 'evolucion'
      },
      {
        id: 'REP002',
        titulo: 'Alertas Generadas - Marzo 2026',
        descripcion: 'Resumen de alertas clínicas y acciones tomadas',
        fecha_generacion: '2026-04-05T14:30:00Z',
        estado: 'completado',
        tipo: 'alertas'
      }
    ];
  }

  async cargarLogsSistema(): Promise<void> {
    this.logsSistema = [
      {
        id: 'LOG001',
        modulo: 'Autenticación',
        mensaje: 'Inicio de sesión exitoso - Admin',
        tipo: 'info',
        fecha: '2026-04-23T08:30:00Z',
        usuario: 'admin@hospital.com'
      },
      {
        id: 'LOG002',
        modulo: 'API',
        mensaje: 'Timeout en consulta a servicio externo',
        tipo: 'warning',
        fecha: '2026-04-23T07:15:00Z',
        usuario: 'system'
      },
      {
        id: 'LOG003',
        modulo: 'Base de Datos',
        mensaje: 'Backup automático completado exitosamente',
        tipo: 'success',
        fecha: '2026-04-23T02:00:00Z',
        usuario: 'scheduler'
      }
    ];

    // Actividad reciente para dashboard
    this.actividadReciente = [
      {
        id: 'ACT001',
        usuario: 'Dr. Juan Pérez',
        accion: 'Generó plan nutricional para paciente PAC050',
        tipo: 'actualizacion',
        fecha: '2026-04-23T10:15:00Z'
      },
      {
        id: 'ACT002',
        usuario: 'Ana López',
        accion: 'Registró signos vitales para paciente PAC045',
        tipo: 'registro',
        fecha: '2026-04-23T09:45:00Z'
      },
      {
        id: 'ACT003',
        usuario: 'María González',
        accion: 'Actualizó perfil de usuario',
        tipo: 'actualizacion',
        fecha: '2026-04-23T08:30:00Z'
      }
    ];

    // Alertas del sistema para dashboard
    this.alertasSistema = [
      {
        id: 'SYS001',
        titulo: 'Actualización Pendiente',
        mensaje: 'Nueva versión del modelo de IA disponible',
        icono: 'cloud-upload-outline',
        critica: false,
        fecha: '2026-04-22T16:00:00Z',
        leida: false
      },
      {
        id: 'SYS002',
        titulo: 'Espacio de Almacenamiento',
        mensaje: 'Base de datos al 85% de capacidad',
        icono: 'warning-outline',
        critica: true,
        fecha: '2026-04-23T06:00:00Z',
        leida: false
      }
    ];
  }

  async cargarBackups(): Promise<void> {
    this.ultimoBackup = '2026-04-23T02:00:00Z';
    this.tamanoBaseDatos = 2847; // MB

    this.backupsDisponibles = [
      { id: 'BK001', fecha: '2026-04-23T02:00:00Z', tamano: '2.8 GB', tipo: 'completo', estado: 'exitoso' },
      { id: 'BK002', fecha: '2026-04-22T02:00:00Z', tamano: '2.7 GB', tipo: 'incremental', estado: 'exitoso' },
      { id: 'BK003', fecha: '2026-04-21T02:00:00Z', tamano: '2.7 GB', tipo: 'incremental', estado: 'exitoso' }
    ];
  }

  // ========================================
  // 👥 GESTIÓN DE USUARIOS
  // ========================================

  // 👁️ Ver detalles de un usuario
  async verDetallesUsuario(usuario: Usuario): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: `Detalles: ${usuario.nombre} ${usuario.apellido}`,
      message: `
        <p><strong>ID:</strong> ${usuario.usuario_id}</p>
        <p><strong>Email:</strong> ${usuario.email}</p>
        <p><strong>Teléfono:</strong> ${usuario.telefono}</p>      
        ${usuario.detalle_rol ? `<p><strong>Especialidad:</strong> ${usuario.detalle_rol}</p>` : ''}
        <p><strong>Registrado:</strong> ${new Date(usuario.fecha_registro).toLocaleDateString('es-EC')}</p>
        <p><strong>Último acceso:</strong> ${usuario.ultimo_acceso ? new Date(usuario.ultimo_acceso).toLocaleDateString('es-EC') : 'Nunca'}</p>
        <p><strong>Estado:</strong> ${usuario.estado ? '✅ Activo' : '❌ Inactivo'}</p>
      `,
      buttons: ['Cerrar'],
      cssClass: 'alert-detalles-usuario'
    });
    await alert.present();
  }

  // ✏️ Editar usuario
  async editarUsuario(usuario: Usuario): Promise<void> {
    // 👇 Aquí iría la navegación a página de edición o modal
    await this.showToast(`Editando: ${usuario.nombre} ${usuario.apellido}`, 'primary');
    // Ejemplo: this.router.navigate(['/admin/editar-usuario', usuario.usuario_id]);
  }

  // 🔄 Cambiar estado de usuario (activar/desactivar)
  async cambiarEstadoUsuario(usuario: Usuario): Promise<void> {
    const nuevoEstado = !usuario.estado;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    const confirm = await this.alertCtrl.create({
      header: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} Usuario?`,
      message: `¿Estás seguro de que deseas ${accion} a ${usuario.nombre} ${usuario.apellido}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: accion === 'activar' ? 'Activar' : 'Desactivar',
          cssClass: accion === 'activar' ? 'alert-button-confirm' : 'alert-button-danger',
          handler: async () => {
            try {
              // 👇 Aquí iría la llamada a API: await this.adminService.updateUserStatus(usuario.usuario_id, nuevoEstado);
              
              usuario.estado = nuevoEstado;
              await this.showToast(`Usuario ${accion === 'activar' ? 'activado' : 'desactivado'} exitosamente`, 'success');
              this.filtrarUsuarios(); // Refrescar lista
            } catch (error) {
              console.error('Error actualizando estado:', error);
              await this.showToast('Error al actualizar estado del usuario', 'danger');
            }
          }
        }
      ]
    });
    await confirm.present();
  }

  // ➕ Mostrar formulario para nuevo usuario
  async mostrarFormularioUsuario(): Promise<void> {
    await this.showToast('Funcionalidad: Formulario de nuevo usuario', 'primary');
    // Ejemplo: this.router.navigate(['/admin/nuevo-usuario']);
  }

  // 📤 Exportar lista de usuarios
  async exportarUsuarios(): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: 'Generando archivo...' });
    await loading.present();

    try {
      // 👇 Simular exportación
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // En producción: generar CSV/Excel y descargar
      // const csv = this.generarCSVUsuarios(this.usuariosFiltrados);
      // this.downloadFile(csv, 'usuarios_export.csv');
      
      await this.showToast('Exportación completada: usuarios_export.csv', 'success');
    } catch (error) {
      await this.showToast('Error al exportar usuarios', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // ========================================
  // 👥 ASIGNACIÓN DE PACIENTES
  // ========================================

  // 👤 Seleccionar paciente para asignar
  seleccionarPaciente(paciente: Paciente): void {
    this.pacienteSeleccionado = paciente;
  }

  // 👩‍⚕️ Seleccionar asistente para asignar
  seleccionarAsistente(asistente: AsistenteMedico): void {
    this.asistenteSeleccionado = asistente;
    // Auto-seleccionar médico asociado al asistente
    this.medicoSeleccionado = this.nutricionistas.find(m => m.nutricionista_id === asistente.medico_id) || null;
  }

  // ✅ Asignar paciente a asistente/médico
  async asignarPaciente(): Promise<void> {
    if (!this.pacienteSeleccionado || !this.asistenteSeleccionado || !this.medicoSeleccionado) {
      await this.showToast('Seleccione paciente, asistente y médico', 'warning');
      return;
    }

    const confirm = await this.alertCtrl.create({
      header: 'Confirmar Asignación',
      message: `
        <p>¿Asignar paciente <strong>${this.pacienteSeleccionado.nombre} ${this.pacienteSeleccionado.apellido}</strong>?</p>
        <p><strong>Asistente:</strong> ${this.asistenteSeleccionado.nombre} ${this.asistenteSeleccionado.apellido}</p>
        <p><strong>Médico:</strong> ${this.medicoSeleccionado.nombre} ${this.medicoSeleccionado.apellido}</p>
      `,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Asignar',
          cssClass: 'alert-button-confirm',
          handler: async () => {
            try {
              // 👇 Aquí iría la llamada a API para crear la asignación
              // await this.adminService.asignarPaciente({ ... });
             /* 
              // Agregar a lista local (mock)
              const nuevaAsignacion: AsignacionPaciente = {
                asignacion_id: `ASG${Date.now()}`,
                paciente_id: this.pacienteSeleccionado.paciente_id,
                paciente_nombre: this.pacienteSeleccionado.nombre,
                paciente_apellido: this.pacienteSeleccionado.apellido,
                asistente_id: this.asistenteSeleccionado.asistente_id,
                asistente_nombre: this.asistenteSeleccionado.nombre,
                asistente_apellido: this.asistenteSeleccionado.apellido,
                medico_id: this.medicoSeleccionado.nutricionista_id,
                medico_nombre: this.medicoSeleccionado.nombre,
                medico_apellido: this.medicoSeleccionado.apellido,
                fecha_asignacion: new Date().toISOString(),
                estado: 'activo'
              };
              
              this.asignacionesActivas.unshift(nuevaAsignacion);*/
              
              // Limpiar selección
              this.pacienteSeleccionado = null;
              this.asistenteSeleccionado = null;
              this.medicoSeleccionado = null;
              
              await this.showToast('Paciente asignado exitosamente', 'success');
            } catch (error) {
              console.error('Error en asignación:', error);
              await this.showToast('Error al asignar paciente', 'danger');
            }
          }
        }
      ]
    });
    await confirm.present();
  }

  // ❌ Desasignar paciente
  async desasignarPaciente(asignacion: AsignacionPaciente): Promise<void> {
    const confirm = await this.alertCtrl.create({
      header: '¿Desasignar Paciente?',
      message: `¿Eliminar la asignación de ${asignacion.paciente_nombre} ${asignacion.paciente_apellido}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Desasignar',
          cssClass: 'alert-button-danger',
          handler: async () => {
            try {
              // 👇 Aquí iría la llamada a API para eliminar la asignación
              // await this.adminService.desasignarPaciente(asignacion.asignacion_id);
              
              // Remover de lista local (mock)
              this.asignacionesActivas = this.asignacionesActivas.filter(a => a.asignacion_id !== asignacion.asignacion_id);
              
              await this.showToast('Paciente desasignado exitosamente', 'success');
            } catch (error) {
              console.error('Error en desasignación:', error);
              await this.showToast('Error al desasignar paciente', 'danger');
            }
          }
        }
      ]
    });
    await confirm.present();
  }

  // ========================================
  // 🏥 REGISTRO DE ASISTENTES MÉDICOS
  // ========================================

  // 👩‍⚕️ Seleccionar enfermera para registrar como asistente
  seleccionarEnfermera(enfermera: Usuario): void {
    this.enfermeraSeleccionada = enfermera;
    // Resetear formulario
    this.nutricionistaSeleccionado = null;
    this.especialidad = '';
    this.fechaContrato = '';
    this.salario = null;
  }

  // ✅ Asignar enfermera como asistente médico
  async asignarAsistente(): Promise<void> {
    if (!this.enfermeraSeleccionada || !this.nutricionistaSeleccionado || !this.especialidad) {
      await this.showToast('Complete todos los campos obligatorios', 'warning');
      return;
    }

    const confirm = await this.alertCtrl.create({
      header: 'Confirmar Registro',
      message: `
        <p>Registrar a <strong>${this.enfermeraSeleccionada.nombre} ${this.enfermeraSeleccionada.apellido}</strong> como asistente médico?</p>
        <p><strong>Nutricionista:</strong> ${this.nutricionistaSeleccionado.nombre} ${this.nutricionistaSeleccionado.apellido}</p>
        <p><strong>Especialidad:</strong> ${this.especialidad}</p>
        ${this.fechaContrato ? `<p><strong>Fecha Contrato:</strong> ${new Date(this.fechaContrato).toLocaleDateString('es-EC')}</p>` : ''}
        ${this.salario ? `<p><strong>Salario:</strong> $${this.salario}</p>` : ''}
      `,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Registrar',
          cssClass: 'alert-button-confirm',
          handler: async () => {
            try {
              // 👇 Aquí iría la llamada a API para crear el registro de asistente
              // await this.adminService.registrarAsistente({ ... });
              
              // Agregar a lista local (mock)
              const nuevoAsistente: AsistenteMedico = {
                asistente_id: `ASIST${Date.now()}`,
                usuario_id: this.enfermeraSeleccionada!.usuario_id,
                nombre: this.enfermeraSeleccionada!.nombre,
                apellido: this.enfermeraSeleccionada!.apellido,
                email: this.enfermeraSeleccionada!.email,
                especialidad: this.especialidad,
                medico_id: this.nutricionistaSeleccionado!.nutricionista_id,
                medico_nombre: this.nutricionistaSeleccionado!.nombre,
                medico_apellido: this.nutricionistaSeleccionado!.apellido,
                fecha_contratacion: this.fechaContrato || new Date().toISOString().split('T')[0],
                salario: this.salario || undefined,
                estado: true
              };
              
              this.asistentesRegistrados.unshift(nuevoAsistente);
              
              // Limpiar selección y formulario
              this.enfermeraSeleccionada = null;
              this.nutricionistaSeleccionado = null;
              this.especialidad = '';
              this.fechaContrato = '';
              this.salario = null;
              
              // Recargar lista de pendientes
              this.cargarEnfermerasPendientes();
              
              await this.showToast('Asistente registrado exitosamente', 'success');
            } catch (error) {
              console.error('Error registrando asistente:', error);
              await this.showToast('Error al registrar asistente', 'danger');
            }
          }
        }
      ]
    });
    await confirm.present();
  }

  // ✏️ Editar asistente registrado
  async editarAsistente(asistente: AsistenteMedico): Promise<void> {
    await this.showToast(`Editando asistente: ${asistente.nombre} ${asistente.apellido}`, 'primary');
    // Ejemplo: this.router.navigate(['/admin/editar-asistente', asistente.asistente_id]);
  }

  // 📊 Generar reporte de contratos
  async generarReporteContratos(): Promise<void> {
    await this.showToast('Generando reporte de contratos...', 'primary');
    // Implementar lógica de generación de reporte
  }

  // ========================================
  // ⚙️ CONFIGURACIÓN DE RED NEURONAL
  // ========================================

  // 💾 Guardar configuración de red neuronal
  async guardarConfiguracionRedNeuronal(): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: 'Guardando configuración...' });
    await loading.present();

    try {
      // 👇 Aquí iría la llamada a API para guardar configuración
      // await this.adminService.updateAIConfig(this.configRedNeuronal);
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.showToast('Configuración de IA guardada exitosamente', 'success');
    } catch (error) {
      console.error('Error guardando configuración:', error);
      await this.showToast('Error al guardar configuración', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // 🔄 Restaurar configuración por defecto
  async restaurarConfiguracion(): Promise<void> {
    const confirm = await this.alertCtrl.create({
      header: 'Restaurar Configuración',
      message: '¿Restaurar los valores por defecto de la red neuronal?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Restaurar',
          cssClass: 'alert-button-warning',
          handler: () => {
            this.configRedNeuronal = {
              activo: true,
              modelo: 'diabetes_v1',
              tasa_aprendizaje: 0.01,
              epocas: 100,
              precision_minima: 0.90
            };
            this.showToast('Configuración restaurada a valores por defecto', 'success');
          }
        }
      ]
    });
    await confirm.present();
  }

  // 🎓 Re-entrenar modelo de IA
  async entrenarModelo(): Promise<void> {
    const loading = await this.loadingCtrl.create({ 
      message: 'Iniciando re-entrenamiento del modelo...',
      spinner: 'lines',
      duration: 0 // Sin límite de tiempo
    });
    await loading.present();

    try {
      // 👇 Aquí iría la llamada a API para iniciar entrenamiento
      // await this.adminService.retrainModel();
      
      // Simular proceso de entrenamiento (en producción sería un polling o WebSocket)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Actualizar métricas mock
      this.metricasIA.precision = Math.min(0.99, this.metricasIA.precision + 0.02);
      this.metricasIA.f1_score = Math.min(0.99, this.metricasIA.f1_score + 0.015);
      
      await this.showToast('Re-entrenamiento completado. Métricas actualizadas.', 'success');
    } catch (error) {
      console.error('Error en entrenamiento:', error);
      await this.showToast('Error durante el re-entrenamiento', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // ========================================
  // 🩺 VARIABLES CLÍNICAS
  // ========================================

  // 🎨 Obtener icono según tipo de variable
  getIconoVariable(tipo: string): string {
    const iconos: Record<string, string> = {
      'glucosa': 'pulse-outline',
      'presion': 'heart-outline',
      'peso': 'scale-outline',
      'imc': 'body-outline',
      'colesterol': 'water-outline',
      'otro': 'ellipse-outline'
    };
    return iconos[tipo] || 'ellipse-outline';
  }

  // ➕ Agregar nueva variable clínica
  async agregarVariable(): Promise<void> {
    await this.showToast('Funcionalidad: Agregar nueva variable clínica', 'primary');
    // Ejemplo: this.router.navigate(['/admin/nueva-variable']);
  }

  // ✏️ Editar variable clínica
  async editarVariable(variable: VariableClinica): Promise<void> {
    await this.showToast(`Editando: ${variable.nombre}`, 'primary');
  }

  // 🔄 Cambiar estado de variable (activa/inactiva)
  async cambiarEstadoVariable(variable: VariableClinica): Promise<void> {
    try {
      // 👇 Aquí iría la llamada a API
      // await this.adminService.updateVariableStatus(variable.id, variable.activo);
      
      const accion = variable.activo ? 'activada' : 'desactivada';
      await this.showToast(`Variable "${variable.nombre}" ${accion}`, 'success');
    } catch (error) {
      console.error('Error actualizando variable:', error);
      variable.activo = !variable.activo; // Revertir cambio visual
      await this.showToast('Error al actualizar variable', 'danger');
    }
  }

  // ========================================
  // 🔔 SISTEMA DE ALERTAS
  // ========================================

  // 🔄 Actualizar configuración de alerta
  async actualizarAlerta(alerta: ConfigAlerta): Promise<void> {
    try {
      // 👇 Aquí iría la llamada a API para actualizar la alerta
      // await this.adminService.updateAlertConfig(alerta.id, alerta);
      
      await this.showToast(`Configuración de "${alerta.nombre}" actualizada`, 'success');
    } catch (error) {
      console.error('Error actualizando alerta:', error);
      await this.showToast('Error al actualizar configuración', 'danger');
    }
  }

  // ========================================
  // 🥗 PLANES NUTRICIONALES
  // ========================================

  // ✏️ Editar plantilla de plan
  async editarPlantilla(plantilla: PlantillaPlan): Promise<void> {
    await this.showToast(`Editando plantilla: ${plantilla.nombre}`, 'primary');
  }

  // 💾 Guardar configuración general de planes
  async guardarConfiguracionPlanes(): Promise<void> {
    try {
      // 👇 Aquí iría la llamada a API
      // await this.adminService.updatePlansConfig(this.configPlanes);
      
      await this.showToast('Configuración de planes guardada', 'success');
    } catch (error) {
      console.error('Error guardando configuración:', error);
      await this.showToast('Error al guardar configuración', 'danger');
    }
  }

  // ========================================
  // 📊 REPORTES Y LOGS
  // ========================================

  // 📤 Generar reporte de uso de plataforma
  async generarReporteUso(): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: 'Generando reporte...' });
    await loading.present();

    try {
      // 👇 Aquí iría la llamada a API para generar reporte
      // const reporte = await this.adminService.generateUsageReport();
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      await this.showToast('Reporte de uso generado: reporte_uso_2026-04.csv', 'success');
    } catch (error) {
      await this.showToast('Error al generar reporte', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // ➕ Generar nuevo reporte médico
  async generarNuevoReporte(): Promise<void> {
    await this.showToast('Funcionalidad: Crear nuevo reporte médico', 'primary');
  }

  // 👁️ Ver reporte médico
  async verReporte(reporte: ReporteMedico): Promise<void> {
    await this.showToast(`Viendo reporte: ${reporte.titulo}`, 'primary');
  }

  // 🔍 Filtrar logs por tipo
  filtrarLogs(event: any): void {
    const tipo = event.detail.value;
    // 👇 Aquí filtrarías this.logsSistema según tipo
    // En producción: llamar a API con parámetro de filtro
    this.showToast(`Filtrando logs: ${tipo}`, 'primary');
  }

  // 🎨 Obtener icono según tipo de log
  getIconoLog(tipo: string): string {
    const iconos: Record<string, string> = {
      'info': 'information-circle-outline',
      'warning': 'warning-outline',
      'error': 'alert-circle-outline',
      'success': 'checkmark-circle-outline'
    };
    return iconos[tipo] || 'ellipse-outline';
  }

  // 📤 Exportar logs del sistema
  async exportarLogs(): Promise<void> {
    await this.showToast('Exportando logs del sistema...', 'primary');
    // Implementar lógica de exportación
  }

  // ========================================
  // 💾 BACKUP & RESTORE
  // ========================================

  // 💾 Crear backup manual
  async crearBackup(): Promise<void> {
    const loading = await this.loadingCtrl.create({ 
      message: 'Creando backup del sistema...',
      spinner: 'lines'
    });
    await loading.present();

    try {
      // 👇 Aquí iría la llamada a API para crear backup
      // await this.adminService.createBackup();
      
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Agregar nuevo backup a lista (mock)
      const nuevoBackup: BackupSistema = {
        id: `BK${Date.now()}`,
        fecha: new Date().toISOString(),
        tamano: `${(this.tamanoBaseDatos / 1024).toFixed(1)} GB`,
        tipo: 'completo',
        estado: 'exitoso'
      };
      this.backupsDisponibles.unshift(nuevoBackup);
      this.ultimoBackup = nuevoBackup.fecha;
      
      await this.showToast('Backup creado exitosamente', 'success');
    } catch (error) {
      console.error('Error creando backup:', error);
      await this.showToast('Error al crear backup', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // 📅 Programar backup automático
  async programarBackup(): Promise<void> {
    await this.showToast('Funcionalidad: Programar backup automático', 'primary');
  }

  // ♻️ Restaurar sistema desde backup
  async restaurarBackup(): Promise<void> {
    if (!this.backupSeleccionado) return;

    const confirm = await this.alertCtrl.create({
      header: '⚠️ Restaurar Sistema',
      message: `
        <p>¿Estás seguro de restaurar el sistema desde el backup del <strong>${new Date(this.backupSeleccionado.fecha).toLocaleDateString('es-EC')}</strong>?</p>
        <p class="ion-text-danger"><strong>Advertencia:</strong> Esta acción es irreversible y sobrescribirá los datos actuales.</p>
      `,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Restaurar',
          cssClass: 'alert-button-danger',
          handler: async () => {
            const confirm2 = await this.alertCtrl.create({
              header: 'Confirmación Final',
              message: 'Escribe "RESTAURAR" para confirmar:',
              inputs: [{ name: 'confirmacion', type: 'text', placeholder: 'RESTAURAR' }],
              buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                  text: 'Confirmar',
                  cssClass: 'alert-button-danger',
                  handler: async (data: any) => {
                    if (data.confirmacion?.toUpperCase() === 'RESTAURAR') {
                      const loading = await this.loadingCtrl.create({ 
                        message: 'Restaurando sistema...',
                        spinner: 'lines',
                        duration: 0
                      });
                      await loading.present();

                      try {
                        // 👇 Aquí iría la llamada a API para restaurar
                        // await this.adminService.restoreBackup(this.backupSeleccionado!.id);
                        
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        await this.showToast('Sistema restaurado exitosamente. Recargando...', 'success');
                        
                        // Recargar página después de restauración
                        setTimeout(() => window.location.reload(), 2000);
                      } catch (error) {
                        console.error('Error restaurando:', error);
                        await this.showToast('Error durante la restauración', 'danger');
                      } finally {
                        await loading.dismiss();
                      }
                    } else {
                      await this.showToast('Confirmación incorrecta', 'warning');
                    }
                  }
                }
              ]
            });
            await confirm2.present();
          }
        }
      ],
      cssClass: 'alert-restore-warning'
    });
    await confirm.present();
  }

  // ========================================
  // 🔔 NOTIFICACIONES Y PERFIL
  // ========================================

  // 🔔 Mostrar notificaciones
  async mostrarNotificaciones(): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Notificaciones',
      buttons: [
        {
          text: '📊 Nueva actualización de IA disponible',
          icon: 'cloud-upload-outline',
          handler: () => this.cambiarModulo('red-neuronal')
        },
        {
          text: '⚠️ Base de datos al 85% de capacidad',
          icon: 'warning-outline',
          role: 'destructive',
          handler: () => this.cambiarModulo('backup')
        },
        {
          text: '👥 3 nuevos usuarios registrados hoy',
          icon: 'people-outline',
          handler: () => this.cambiarModulo('usuarios')
        },
        {
          text: 'Marcar todas como leídas',
          icon: 'checkmark-done-outline',
          role: 'cancel',
          handler: async () => {
            this.estadisticas.notificacionesNoLeidas = 0;
            await this.showToast('Notificaciones marcadas como leídas', 'success');
          }
        }
      ]
    });
    await actionSheet.present();
  }

  // 👤 Mostrar menú de perfil
  async mostrarPerfil(): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: this.usuarioActual ? `${this.usuarioActual.nombre} ${this.usuarioActual.apellido}` : 'Perfil',
      buttons: [
        {
          text: 'Mi Perfil',
          icon: 'person-outline',
          handler: () => this.showToast('Funcionalidad: Ver perfil', 'primary')
        },
        {
          text: 'Configuración',
          icon: 'settings-outline',
          handler: () => this.showToast('Funcionalidad: Configuración de cuenta', 'primary')
        },
        {
          text: 'Cerrar Sesión',
          icon: 'log-out-outline',
          role: 'destructive',
          handler: async () => {
            const confirm = await this.alertCtrl.create({
              header: 'Cerrar Sesión',
              message: '¿Estás seguro de cerrar sesión?',
              buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                  text: 'Salir',
                  handler: async () => {
                    // 👇 Aquí iría la lógica de logout
                    localStorage.removeItem('token');
                    localStorage.removeItem('user_data');
                    await this.showToast('Sesión cerrada', 'success');
                    this.router.navigate(['/login'], { replaceUrl: true });
                  }
                }
              ]
            });
            await confirm.present();
          }
        }
      ]
    });
    await actionSheet.present();
  }

  // ========================================
  // 🎯 ACCIONES DEL DASHBOARD
  // ========================================

  // 👁️ Ver toda la actividad reciente
  async verTodaActividad(): Promise<void> {
    await this.showToast('Funcionalidad: Ver historial completo de actividad', 'primary');
  }

  // ========================================
  // 🔔 UTILIDADES
  // ========================================

  // 🔔 Mostrar toast notification
  async showToast(message: string, color: 'primary' | 'success' | 'danger' | 'warning' = 'primary', duration: number = 2500): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'bottom',
      icon: this.getToastIcon(color),
      cssClass: 'toast-custom'
    });
    toast.present();
  }

  // 🎨 Helper para iconos de toast
  private getToastIcon(color: string): string {
    const icons: Record<string, string> = {
      'success': 'checkmark-circle-outline',
      'danger': 'alert-circle-outline',
      'warning': 'warning-outline',
      'primary': 'information-circle-outline'
    };
    return icons[color] || 'information-circle-outline';
  }

  // 🔄 Refrescar datos del módulo actual
  async refrescarModulo(event?: any): Promise<void> {
    try {
      await this.cargarDatosIniciales();
      await this.showToast('Datos actualizados', 'success');
    } finally {
      if (event?.target?.complete) {
        event.target.complete();
      }
    }
  }




}