import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EnfermeriaBuscarPacientePage } from './enfermeria-buscar-paciente.page';

const routes: Routes = [
  {
    path: '',
    component: EnfermeriaBuscarPacientePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EnfermeriaBuscarPacientePageRoutingModule {}
