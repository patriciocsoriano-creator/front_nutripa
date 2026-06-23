import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';

interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  total_usuarios?: number;
  total_permisos?: number;
}

interface Permiso {
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
}

@Component({
  selector: 'app-admin-roles-permisos',
  templateUrl: './admin-roles-permisos.page.html',
  styleUrls: ['./admin-roles-permisos.page.scss'],
  standalone: false,
})
export class AdminRolesPermisosPage implements OnInit {
  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = 'usuarios';
  nombreAdmin: string = '';
  rol: string = 'Administrador';
  private isMobile = false;

  // Estado
  cargando = false;
  guardando = false;
  roles: Rol[] = [];
  permisosDisponibles: Permiso[] = [];
  rolSeleccionado: Rol | null = null;
  permisosActivos: Set<string> = new Set();
  categoriasAbiertas: Record<string, boolean> = {};

  // Definicion de permisos del sistema
  private readonly PERMISOS_SISTEMA: Permiso[] = [
    // Dashboard
    { codigo: 'dashboard.view', nombre: 'Ver Dashboard', descripcion: 'Acceso al panel principal', categoria: 'dashboard' },
    
    // Usuarios
    { codigo: 'usuarios.view', nombre: 'Ver Usuarios', descripcion: 'Listar todos los usuarios', categoria: 'usuarios' },
    { codigo: 'usuarios.create', nombre: 'Crear Usuarios', descripcion: 'Registrar nuevos usuarios', categoria: 'usuarios' },
    { codigo: 'usuarios.edit', nombre: 'Editar Usuarios', descripcion: 'Modificar datos de usuarios', categoria: 'usuarios' },
    { codigo: 'usuarios.delete', nombre: 'Eliminar Usuarios', descripcion: 'Eliminar usuarios del sistema', categoria: 'usuarios' },
    { codigo: 'usuarios.toggle', nombre: 'Activar/Desactivar', descripcion: 'Cambiar estado de usuarios', categoria: 'usuarios' },
    
    // Medicos
    { codigo: 'medicos.view', nombre: 'Ver Medicos', descripcion: 'Listar medicos y enfermeras', categoria: 'medicos' },
    { codigo: 'medicos.create', nombre: 'Crear Medicos', descripcion: 'Registrar nuevos medicos', categoria: 'medicos' },
    { codigo: 'medicos.edit', nombre: 'Editar Medicos', descripcion: 'Modificar datos de medicos', categoria: 'medicos' },
    { codigo: 'medicos.asignar', nombre: 'Asignar Pacientes', descripcion: 'Asignar pacientes a medicos', categoria: 'medicos' },
    
    // Pacientes
    { codigo: 'pacientes.view', nombre: 'Ver Pacientes', descripcion: 'Listar pacientes registrados', categoria: 'pacientes' },
    { codigo: 'pacientes.create', nombre: 'Crear Pacientes', descripcion: 'Registrar nuevos pacientes', categoria: 'pacientes' },
    { codigo: 'pacientes.edit', nombre: 'Editar Pacientes', descripcion: 'Modificar datos de pacientes', categoria: 'pacientes' },
    { codigo: 'pacientes.delete', nombre: 'Eliminar Pacientes', descripcion: 'Eliminar pacientes del sistema', categoria: 'pacientes' },
    
    // Registros Clinicos
    { codigo: 'registros.view', nombre: 'Ver Registros', descripcion: 'Ver registros clinicos', categoria: 'registros' },
    { codigo: 'registros.create', nombre: 'Crear Registros', descripcion: 'Crear nuevos registros clinicos', categoria: 'registros' },
    { codigo: 'registros.edit', nombre: 'Editar Registros', descripcion: 'Modificar registros clinicos', categoria: 'registros' },
    
    // Planes Nutricionales
    { codigo: 'planes.view', nombre: 'Ver Planes', descripcion: 'Ver planes nutricionales', categoria: 'planes' },
    { codigo: 'planes.create', nombre: 'Crear Planes', descripcion: 'Crear nuevos planes nutricionales', categoria: 'planes' },
    { codigo: 'planes.edit', nombre: 'Editar Planes', descripcion: 'Modificar planes nutricionales', categoria: 'planes' },
    { codigo: 'planes.validar', nombre: 'Validar Planes IA', descripcion: 'Validar planes generados por IA', categoria: 'planes' },
    
    // Seguimiento
    { codigo: 'seguimiento.view', nombre: 'Ver Seguimiento', descripcion: 'Ver seguimiento clinico', categoria: 'seguimiento' },
    { codigo: 'seguimiento.create', nombre: 'Crear Seguimiento', descripcion: 'Registrar nuevo seguimiento', categoria: 'seguimiento' },
    
    // Reportes
    { codigo: 'reportes.view', nombre: 'Ver Reportes', descripcion: 'Acceder a reportes del sistema', categoria: 'reportes' },
    { codigo: 'reportes.export', nombre: 'Exportar Reportes', descripcion: 'Exportar reportes a PDF/Excel', categoria: 'reportes' },
    { codigo: 'auditoria.view', nombre: 'Ver Auditoria', descripcion: 'Ver logs de auditoria', categoria: 'reportes' },
    
    // Configuracion
    { codigo: 'config.view', nombre: 'Ver Configuracion', descripcion: 'Ver parametros del sistema', categoria: 'configuracion' },
    { codigo: 'config.edit', nombre: 'Editar Configuracion', descripcion: 'Modificar parametros del sistema', categoria: 'configuracion' },
    { codigo: 'config.backup', nombre: 'Gestionar Respaldos', descripcion: 'Crear y restaurar respaldos', categoria: 'configuracion' },
    { codigo: 'config.ia', nombre: 'Configurar IA', descripcion: 'Configurar modelo de IA', categoria: 'configuracion' },
    
    // Roles
    { codigo: 'roles.view', nombre: 'Ver Roles', descripcion: 'Listar roles del sistema', categoria: 'roles' },
    { codigo: 'roles.edit', nombre: 'Editar Roles', descripcion: 'Modificar permisos de roles', categoria: 'roles' }
  ];

  // Permisos por defecto para cada rol
  private readonly PERMISOS_POR_DEFECTO: Record<string, string[]> = {
    admin: this.PERMISOS_SISTEMA.map(p => p.codigo),
    doctor: [
      'dashboard.view', 'pacientes.view', 'registros.view', 'registros.create',
      'planes.view', 'planes.create', 'planes.edit', 'planes.validar',
      'seguimiento.view', 'seguimiento.create', 'reportes.view'
    ],
    nutricionista: [
      'dashboard.view', 'pacientes.view', 'registros.view',
      'planes.view', 'planes.create', 'planes.edit', 'planes.validar',
      'seguimiento.view', 'seguimiento.create'
    ],
    enfermera: [
      'dashboard.view', 'pacientes.view', 'registros.view', 'registros.create',
      'seguimiento.view'
    ],
    paciente: [
      'dashboard.view', 'pacientes.view', 'planes.view', 'seguimiento.view'
    ]
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
      if (!this.isMobile) {
        this.sidebarOpen = true;
      }
    });
  }

  ngOnInit() {
    this.cargarDatosAdmin();
    this.cargarRoles();
    this.permisosDisponibles = this.PERMISOS_SISTEMA;
    
    // Abrir todas las categorias por defecto
    this.getCategorias().forEach(cat => {
      this.categoriasAbiertas[cat] = true;
    });
  }

  private cargarDatosAdmin() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreAdmin = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Administrador';
        this.rol = user.rol === 'admin' ? 'Administrador General' : 'Administrador';
      } catch (e) {
        console.warn('Error parseando usuario');
      }
    }
  }

  async cargarRoles() {
    this.cargando = true;
    const token = localStorage.getItem('token');

    try {
      // Cargar usuarios para contar por rol
      const usuariosRes: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/usuarios`,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      const usuarios = usuariosRes?.usuarios || [];

      // Construir lista de roles con contadores
      this.roles = [
  { id: 1, nombre: 'admin', descripcion: 'Acceso total al sistema', total_usuarios: 0, total_permisos: this.PERMISOS_POR_DEFECTO['admin'].length },
  { id: 2, nombre: 'nutricionista', descripcion: 'Profesional en nutricion', total_usuarios: 0, total_permisos: this.PERMISOS_POR_DEFECTO['nutricionista'].length },
  { id: 3, nombre: 'enfermera', descripcion: 'Personal de enfermeria', total_usuarios: 0, total_permisos: this.PERMISOS_POR_DEFECTO['enfermera'].length },
  { id: 4, nombre: 'paciente', descripcion: 'Usuario paciente', total_usuarios: 0, total_permisos: this.PERMISOS_POR_DEFECTO['paciente'].length },
  { id: 5, nombre: 'doctor', descripcion: 'Medico tratante', total_usuarios: 0, total_permisos: this.PERMISOS_POR_DEFECTO['doctor'].length }
];

      // Contar usuarios por rol
      this.roles.forEach(rol => {
        rol.total_usuarios = usuarios.filter((u: any) => u.rol === rol.nombre).length;
      });

      console.log('Roles cargados:', this.roles);
    } catch (error) {
      console.error('Error cargando roles:', error);
      await this.showToast('Error al cargar roles', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  seleccionarRol(rol: Rol) {
    this.rolSeleccionado = rol;
    this.cargarPermisosRol(rol);
  }

  private cargarPermisosRol(rol: Rol) {
    // Cargar permisos por defecto para el rol
    const permisosDefecto = this.PERMISOS_POR_DEFECTO[rol.nombre] || [];
    this.permisosActivos = new Set(permisosDefecto);
    
    // El admin siempre tiene todos los permisos y no se pueden modificar
    if (rol.nombre === 'admin') {
      this.permisosActivos = new Set(this.PERMISOS_SISTEMA.map(p => p.codigo));
    }
  }

  getCategorias(): string[] {
    const categorias = new Set(this.PERMISOS_SISTEMA.map(p => p.categoria));
    return Array.from(categorias);
  }

  getNombreCategoria(categoria: string): string {
    const nombres: Record<string, string> = {
      dashboard: 'Panel Principal',
      usuarios: 'Gestion de Usuarios',
      medicos: 'Gestion de Medicos',
      pacientes: 'Gestion de Pacientes',
      registros: 'Registros Clinicos',
      planes: 'Planes Nutricionales',
      seguimiento: 'Seguimiento Clinico',
      reportes: 'Reportes y Auditoria',
      configuracion: 'Configuracion del Sistema',
      roles: 'Gestion de Roles'
    };
    return nombres[categoria] || categoria;
  }

  getIconoCategoria(categoria: string): string {
    const iconos: Record<string, string> = {
      dashboard: 'home-outline',
      usuarios: 'people-outline',
      medicos: 'medkit-outline',
      pacientes: 'accessibility-outline',
      registros: 'document-text-outline',
      planes: 'nutrition-outline',
      seguimiento: 'pulse-outline',
      reportes: 'stats-chart-outline',
      configuracion: 'settings-outline',
      roles: 'shield-outline'
    };
    return iconos[categoria] || 'list-outline';
  }

  getPermisosPorCategoria(categoria: string): Permiso[] {
    return this.PERMISOS_SISTEMA.filter(p => p.categoria === categoria);
  }

  contarPermisosCategoria(categoria: string): string {
    const permisos = this.getPermisosPorCategoria(categoria);
    const activos = permisos.filter(p => this.permisosActivos.has(p.codigo)).length;
    return `${activos}/${permisos.length}`;
  }

  esPermisoActivo(codigo: string): boolean {
    return this.permisosActivos.has(codigo);
  }

  togglePermiso(codigo: string, activar: boolean) {
    // El admin no puede tener permisos modificados
    if (this.rolSeleccionado?.nombre === 'admin') {
      this.showToast('Los permisos del administrador no se pueden modificar', 'warning');
      return;
    }

    if (activar) {
      this.permisosActivos.add(codigo);
    } else {
      this.permisosActivos.delete(codigo);
    }
  }

  toggleCategoria(categoria: string) {
    this.categoriasAbiertas[categoria] = !this.categoriasAbiertas[categoria];
  }

  seleccionarTodos() {
    if (this.rolSeleccionado?.nombre === 'admin') {
      return;
    }
    this.PERMISOS_SISTEMA.forEach(p => this.permisosActivos.add(p.codigo));
  }

  deseleccionarTodos() {
    if (this.rolSeleccionado?.nombre === 'admin') {
      this.showToast('El administrador debe tener todos los permisos', 'warning');
      return;
    }
    this.permisosActivos.clear();
  }

  contarPermisosActivos(): number {
    return this.permisosActivos.size;
  }

  async guardarPermisos() {
    if (!this.rolSeleccionado) return;

    if (this.rolSeleccionado.nombre === 'admin') {
      await this.showToast('Los permisos del administrador no se pueden modificar', 'warning');
      return;
    }

    this.guardando = true;

    try {
      // Actualizar el total de permisos en el rol
      this.rolSeleccionado.total_permisos = this.permisosActivos.size;
      
      // Actualizar permisos por defecto en memoria
      this.PERMISOS_POR_DEFECTO[this.rolSeleccionado.nombre] = Array.from(this.permisosActivos);
      
      await this.showToast('Permisos guardados correctamente', 'success');
      console.log('Permisos guardados para', this.rolSeleccionado.nombre, ':', Array.from(this.permisosActivos));
    } catch (error) {
      console.error('Error guardando permisos:', error);
      await this.showToast('Error al guardar permisos', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  async mostrarCrearRol() {
    const alert = await this.alertCtrl.create({
      header: 'Crear Nuevo Rol',
      message: 'Funcionalidad en desarrollo. Los roles actuales son fijos del sistema.',
      buttons: ['Entendido']
    });
    await alert.present();
  }

  getIconoRol(nombre: string): string {
    const iconos: Record<string, string> = {
      admin: 'shield-checkmark-outline',
      doctor: 'medkit-outline',
      nutricionista: 'restaurant-outline',
      enfermera: 'heart-outline',
      paciente: 'person-outline'
    };
    return iconos[nombre] || 'person-outline';
  }

  getNombreRol(nombre: string): string {
    const nombres: Record<string, string> = {
      admin: 'Administrador',
      doctor: 'Medico',
      nutricionista: 'Nutricionista',
      enfermera: 'Enfermera',
      paciente: 'Paciente'
    };
    return nombres[nombre] || nombre;
  }

  // Navegacion
  navegarA(ruta: string): void {
    const rutas: Record<string, string> = {
      'admin-inicio': '/administrador',
      'admin-ver-usuarios': '/admin-ver-usuarios',
      'admin-agregar-usuario': '/admin-agregar-usuario',
      'admin-roles-permisos': '/admin-roles-permisos',
      'admin-ver-medicos': '/admin-ver-medicos',
      'admin-agregar-medico': '/admin-agregar-medico',
      'admin-asignaciones': '/admin-asignaciones',
      'admin-ver-pacientes': '/admin-ver-pacientes',
      'admin-estadisticas-pacientes': '/admin-estadisticas-pacientes',
      'admin-reportes-globales': '/admin-reportes-globales',
      'admin-auditoria': '/admin-auditoria',
      'admin-actividad-usuarios': '/admin-actividad-usuarios',
      'admin-config-general': '/admin-config-general',
      'admin-config-parametros': '/admin-config-parametros',
      'admin-config-backup': '/admin-config-backup'
    };

    const rutaDestino = rutas[ruta] || `/${ruta}`;
    
    if (this.isMobile) {
      this.sidebarOpen = false;
    }
    
    this.router.navigate([rutaDestino]);
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleSubmenu(item: string) {
    this.submenuAbierto = this.submenuAbierto === item ? null : item;
  }

  async cerrarSesion() {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesion',
      message: 'Esta seguro que desea cerrar sesion?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Si, cerrar',
          cssClass: 'alert-button-danger',
          handler: () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            this.router.navigate(['/principal']);
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msg, color, duration: 3000, position: 'bottom' });
    await toast.present();
  }
}