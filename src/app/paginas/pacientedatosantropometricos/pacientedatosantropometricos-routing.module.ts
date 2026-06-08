import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PacientedatosantropometricosPage } from './pacientedatosantropometricos.page';

const routes: Routes = [
  {
    path: '',
    component: PacientedatosantropometricosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PacientedatosantropometricosPageRoutingModule {}
