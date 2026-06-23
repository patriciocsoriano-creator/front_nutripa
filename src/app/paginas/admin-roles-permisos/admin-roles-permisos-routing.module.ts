import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminRolesPermisosPage } from './admin-roles-permisos.page';

const routes: Routes = [
  {
    path: '',
    component: AdminRolesPermisosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRolesPermisosPageRoutingModule {}
