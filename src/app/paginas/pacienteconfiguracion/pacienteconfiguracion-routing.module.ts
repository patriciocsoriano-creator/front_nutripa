import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PacienteconfiguracionPage } from './pacienteconfiguracion.page';

const routes: Routes = [
  {
    path: '',
    component: PacienteconfiguracionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PacienteconfiguracionPageRoutingModule {}
