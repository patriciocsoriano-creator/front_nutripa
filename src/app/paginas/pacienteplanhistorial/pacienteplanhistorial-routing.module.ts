import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PacienteplanhistorialPage } from './pacienteplanhistorial.page';

const routes: Routes = [
  {
    path: '',
    component: PacienteplanhistorialPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PacienteplanhistorialPageRoutingModule {}
