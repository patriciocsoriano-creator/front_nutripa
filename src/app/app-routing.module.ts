import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'principal',
    pathMatch: 'full'
  },
  {
    path: 'principal',
    loadChildren: () => import('./paginas/principal/principal.module').then( m => m.PrincipalPageModule)
  },
  {
    path: 'enfermeria',
    loadChildren: () => import('./paginas/enfermeria/enfermeria.module').then( m => m.EnfermeriaPageModule)
  },
  {
    path: 'registroinfopaciente',
    loadChildren: () => import('./paginas/registroinfopaciente/registroinfopaciente.module').then( m => m.RegistroinfopacientePageModule)
  },
  {
    path: 'registroinfosignosvitales',
    loadChildren: () => import('./paginas/registroinfosignosvitales/registroinfosignosvitales.module').then( m => m.RegistroinfosignosvitalesPageModule)
  },
  {
    path: 'registroinfoantropometricos',
    loadChildren: () => import('./paginas/registroinfoantropometricos/registroinfoantropometricos.module').then( m => m.RegistroinfoantropometricosPageModule)
  },
  {
    path: 'registroinfometabolicas',
    loadChildren: () => import('./paginas/registroinfometabolicas/registroinfometabolicas.module').then( m => m.RegistroinfometabolicasPageModule)
  },
  {
    path: 'principalregistro',
    loadChildren: () => import('./paginas/principalregistro/principalregistro.module').then( m => m.PrincipalregistroPageModule)
  },
  {
    path: 'medico',
    loadChildren: () => import('./paginas/medico/medico.module').then( m => m.MedicoPageModule)
  },
  {
    path: 'administrador',
    loadChildren: () => import('./paginas/administrador/administrador.module').then( m => m.AdministradorPageModule)
  },
  {
    path: 'medicoverpacientes',
    loadChildren: () => import('./paginas/medicoverpacientes/medicoverpacientes.module').then( m => m.MedicoverpacientesPageModule)
  },
  {
    path: 'medicoconsultarpaciente',
    loadChildren: () => import('./paginas/medicoconsultarpaciente/medicoconsultarpaciente.module').then( m => m.MedicoconsultarpacientePageModule)
  },
  {
    path: 'medicoconsultarpaciente/:id',  // 👈 ¡IMPORTANTE! Para recibir el ID
    loadChildren: () => import('./paginas/medicoconsultarpaciente/medicoconsultarpaciente.module').then(m => m.MedicoconsultarpacientePageModule)
  },
  {
    path: 'medicocrearplan',
    loadChildren: () => import('./paginas/medicocrearplan/medicocrearplan.module').then( m => m.MedicocrearplanPageModule)
  },
  {
    path: 'principalolvidocontrasena',
    loadChildren: () => import('./paginas/principalolvidocontrasena/principalolvidocontrasena.module').then( m => m.PrincipalolvidocontrasenaPageModule)
  },
  {
    path: 'medicoplanalimenticio',
    loadChildren: () => import('./paginas/medicoplanalimenticio/medicoplanalimenticio.module').then( m => m.MedicoplanalimenticioPageModule)
  },
  {
    path: 'medicoplanalimenticio-detalle',
    loadChildren: () => import('./paginas/medicoplanalimenticio-detalle/medicoplanalimenticio-detalle.module').then( m => m.MedicoplanalimenticioDetallePageModule)
  },
  {
    path: 'medicoplanesnutricionalescreados',
    loadChildren: () => import('./paginas/medicoplanesnutricionalescreados/medicoplanesnutricionalescreados.module').then( m => m.MedicoplanesnutricionalescreadosPageModule)
  },
  {
    path: 'medicoplanesnutricionalescreadosver/:id',
    loadChildren: () => import('./paginas/medicoplanesnutricionalescreadosver/medicoplanesnutricionalescreadosver.module')
      .then(m => m.MedicoplanesnutricionalescreadosverPageModule)
  },

  {
    path: 'medicoseguimientoclinico',
    loadChildren: () => import('./paginas/medicoseguimientoclinico/medicoseguimientoclinico.module').then( m => m.MedicoseguimientoclinicoPageModule)
  },

  {
  path: 'medicoseguimientoclinico/:pacienteId',  // 👈 AGREGAR ESTA RUTA
  loadChildren: () => import('./paginas/medicoseguimientoclinico/medicoseguimientoclinico.module')
    .then(m => m.MedicoseguimientoclinicoPageModule)
},
  {
    path: 'medicoinformes',
    loadChildren: () => import('./paginas/medicoinformes/medicoinformes.module').then( m => m.MedicoinformesPageModule)
  },
  {
    path: 'paciente',
    loadChildren: () => import('./paginas/paciente/paciente.module').then( m => m.PacientePageModule)
  },
  {
    path: 'pacienteverplan',
    loadChildren: () => import('./paginas/pacienteverplan/pacienteverplan.module').then( m => m.PacienteverplanPageModule)
  },
  {
    path: 'pacienteplanhistorial',
    loadChildren: () => import('./paginas/pacienteplanhistorial/pacienteplanhistorial.module').then( m => m.PacienteplanhistorialPageModule)
  },
  {
    path: 'pacientedatosantropometricos',
    loadChildren: () => import('./paginas/pacientedatosantropometricos/pacientedatosantropometricos.module').then( m => m.PacientedatosantropometricosPageModule)
  },
  {
    path: 'pacienteregistrarglucosa',
    loadChildren: () => import('./paginas/pacienteregistrarglucosa/pacienteregistrarglucosa.module').then( m => m.PacienteregistrarglucosaPageModule)
  },
  {
    path: 'pacienteverglucosa',
    loadChildren: () => import('./paginas/pacienteverglucosa/pacienteverglucosa.module').then( m => m.PacienteverglucosaPageModule)
  },
  {
    path: 'pacienteregistrarpresion',
    loadChildren: () => import('./paginas/pacienteregistrarpresion/pacienteregistrarpresion.module').then( m => m.PacienteregistrarpresionPageModule)
  },
  {
    path: 'pacienteverpresion',
    loadChildren: () => import('./paginas/pacienteverpresion/pacienteverpresion.module').then( m => m.PacienteverpresionPageModule)
  },
  {
    path: 'enfermeriaverpacientes',
    loadChildren: () => import('./paginas/enfermeriaverpacientes/enfermeriaverpacientes.module').then( m => m.EnfermeriaverpacientesPageModule)
  },
  {
    path: 'enfermeriaverpacientesinfo',
    loadChildren: () => import('./paginas/enfermeriaverpacientesinfo/enfermeriaverpacientesinfo.module').then( m => m.EnfermeriaverpacientesinfoPageModule)
  },
  {
    path: 'registrofinalizado',
    loadChildren: () => import('./paginas/registrofinalizado/registrofinalizado.module').then( m => m.RegistrofinalizadoPageModule)
  },
  {
    path: 'admin-ver-usuarios',
    loadChildren: () => import('./paginas/admin-ver-usuarios/admin-ver-usuarios.module').then( m => m.AdminVerUsuariosPageModule)
  },
  {
    path: 'admin-agregar-medico',
    loadChildren: () => import('./paginas/admin-agregar-medico/admin-agregar-medico.module').then( m => m.AdminAgregarMedicoPageModule)
  },
  {
    path: 'admin-asignaciones',
    loadChildren: () => import('./paginas/admin-asignaciones/admin-asignaciones.module').then( m => m.AdminAsignacionesPageModule)
  },
  {
    path: 'admin-auditoria',
    loadChildren: () => import('./paginas/admin-auditoria/admin-auditoria.module').then( m => m.AdminAuditoriaPageModule)
  },
  {
    path: 'admin-ver-medicos',
    loadChildren: () => import('./paginas/admin-ver-medicos/admin-ver-medicos.module').then( m => m.AdminVerMedicosPageModule)
  },
  {
    path: 'admin-ver-pacientes',
    loadChildren: () => import('./paginas/admin-ver-pacientes/admin-ver-pacientes.module').then( m => m.AdminVerPacientesPageModule)
  },
  {
    path: 'admin-config-general',
    loadChildren: () => import('./paginas/admin-config-general/admin-config-general.module').then( m => m.AdminConfigGeneralPageModule)
  },
  {
    path: 'admin-config-parametros',
    loadChildren: () => import('./paginas/admin-config-parametros/admin-config-parametros.module').then( m => m.AdminConfigParametrosPageModule)
  },
  {
    path: 'admin-config-backup',
    loadChildren: () => import('./paginas/admin-config-backup/admin-config-backup.module').then( m => m.AdminConfigBackupPageModule)
  },
  {
    path: 'admin-agregar-usuario',
    loadChildren: () => import('./paginas/admin-agregar-usuario/admin-agregar-usuario.module').then( m => m.AdminAgregarUsuarioPageModule)
  },
  {
    path: 'admin-roles-permisos',
    loadChildren: () => import('./paginas/admin-roles-permisos/admin-roles-permisos.module').then( m => m.AdminRolesPermisosPageModule)
  },
  {
    path: 'admin-estadisticas-pacientes',
    loadChildren: () => import('./paginas/admin-estadisticas-pacientes/admin-estadisticas-pacientes.module').then( m => m.AdminEstadisticasPacientesPageModule)
  },
  {
    path: 'admin-reportes-globales',
    loadChildren: () => import('./paginas/admin-reportes-globales/admin-reportes-globales.module').then( m => m.AdminReportesGlobalesPageModule)
  },
  {
    path: 'admin-actividad-usuarios',
    loadChildren: () => import('./paginas/admin-actividad-usuarios/admin-actividad-usuarios.module').then( m => m.AdminActividadUsuariosPageModule)
  },
  {
    path: 'medico-agregar-paciente',
    loadChildren: () => import('./paginas/medico-agregar-paciente/medico-agregar-paciente.module').then( m => m.MedicoAgregarPacientePageModule)
  },
  {
    path: 'medico-buscar-paciente',
    loadChildren: () => import('./paginas/medico-buscar-paciente/medico-buscar-paciente.module').then( m => m.MedicoBuscarPacientePageModule)
  },
  {
    path: 'medico-configuracion',
    loadChildren: () => import('./paginas/medico-configuracion/medico-configuracion.module').then( m => m.MedicoConfiguracionPageModule)
  },
  {
    path: 'enfermeria-buscar-paciente',
    loadChildren: () => import('./paginas/enfermeria-buscar-paciente/enfermeria-buscar-paciente.module').then( m => m.EnfermeriaBuscarPacientePageModule)
  },
  {
    path: 'enfermeria-reportes',
    loadChildren: () => import('./paginas/enfermeria-reportes/enfermeria-reportes.module').then( m => m.EnfermeriaReportesPageModule)
  },
  
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
