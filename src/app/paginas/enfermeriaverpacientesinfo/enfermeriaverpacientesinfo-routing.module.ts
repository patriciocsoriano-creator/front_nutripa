import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EnfermeriaverpacientesinfoPage } from './enfermeriaverpacientesinfo.page';

const routes: Routes = [
  {
    path: '',
    component: EnfermeriaverpacientesinfoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EnfermeriaverpacientesinfoPageRoutingModule {}
