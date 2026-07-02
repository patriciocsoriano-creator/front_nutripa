import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PacientehistorialmedicoPage } from './pacientehistorialmedico.page';

const routes: Routes = [
  {
    path: '',
    component: PacientehistorialmedicoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PacientehistorialmedicoPageRoutingModule {}
