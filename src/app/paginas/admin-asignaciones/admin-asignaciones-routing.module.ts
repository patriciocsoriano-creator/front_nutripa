import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminAsignacionesPage } from './admin-asignaciones.page';

const routes: Routes = [
  {
    path: '',
    component: AdminAsignacionesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminAsignacionesPageRoutingModule {}
