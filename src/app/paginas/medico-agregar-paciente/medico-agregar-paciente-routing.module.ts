import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MedicoAgregarPacientePage } from './medico-agregar-paciente.page';

const routes: Routes = [
  {
    path: '',
    component: MedicoAgregarPacientePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MedicoAgregarPacientePageRoutingModule {}
