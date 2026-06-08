import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PacienteregistrarpresionPage } from './pacienteregistrarpresion.page';

const routes: Routes = [
  {
    path: '',
    component: PacienteregistrarpresionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PacienteregistrarpresionPageRoutingModule {}
