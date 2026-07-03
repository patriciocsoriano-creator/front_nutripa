import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MedicoNotificacionesPage } from './mediconotificaciones.page';

const routes: Routes = [
  {
    path: '',
    component: MedicoNotificacionesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MediconotificacionesPageRoutingModule {}
