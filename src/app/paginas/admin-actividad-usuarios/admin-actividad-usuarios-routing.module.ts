import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminActividadUsuariosPage } from './admin-actividad-usuarios.page';

const routes: Routes = [
  {
    path: '',
    component: AdminActividadUsuariosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminActividadUsuariosPageRoutingModule {}
