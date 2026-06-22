import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminVerUsuariosPage } from './admin-ver-usuarios.page';

const routes: Routes = [
  {
    path: '',
    component: AdminVerUsuariosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminVerUsuariosPageRoutingModule {}
