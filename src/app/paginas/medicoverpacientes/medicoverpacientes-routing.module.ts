import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MedicoverpacientesPage } from './medicoverpacientes.page';

const routes: Routes = [
  {
    path: '',
    component: MedicoverpacientesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MedicoverpacientesPageRoutingModule {}
