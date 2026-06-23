import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminEstadisticasPacientesPage } from './admin-estadisticas-pacientes.page';

const routes: Routes = [
  {
    path: '',
    component: AdminEstadisticasPacientesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminEstadisticasPacientesPageRoutingModule {}
