import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RegistroinfopacientePage } from './registroinfopaciente.page';

const routes: Routes = [
  {
    path: '',
    component: RegistroinfopacientePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RegistroinfopacientePageRoutingModule {}
