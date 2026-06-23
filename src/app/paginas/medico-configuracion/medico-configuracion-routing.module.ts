import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MedicoConfiguracionPage } from './medico-configuracion.page';

const routes: Routes = [
  {
    path: '',
    component: MedicoConfiguracionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MedicoConfiguracionPageRoutingModule {}
