import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MedicoconsultarpacientePage } from './medicoconsultarpaciente.page';

const routes: Routes = [
  {
    path: '',
    component: MedicoconsultarpacientePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MedicoconsultarpacientePageRoutingModule {}
