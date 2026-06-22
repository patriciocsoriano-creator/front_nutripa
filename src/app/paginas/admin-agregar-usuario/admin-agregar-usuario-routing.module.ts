import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminAgregarUsuarioPage } from './admin-agregar-usuario.page';

const routes: Routes = [
  {
    path: '',
    component: AdminAgregarUsuarioPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminAgregarUsuarioPageRoutingModule {}
