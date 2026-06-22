import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminVerPacientesPage } from './admin-ver-pacientes.page';

const routes: Routes = [
  {
    path: '',
    component: AdminVerPacientesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminVerPacientesPageRoutingModule {}
