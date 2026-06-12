import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EnfermeriaverpacientesPage } from './enfermeriaverpacientes.page';

const routes: Routes = [
  {
    path: '',
    component: EnfermeriaverpacientesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EnfermeriaverpacientesPageRoutingModule {}
