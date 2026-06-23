import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MedicoBuscarPacientePage } from './medico-buscar-paciente.page';

const routes: Routes = [
  {
    path: '',
    component: MedicoBuscarPacientePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MedicoBuscarPacientePageRoutingModule {}
