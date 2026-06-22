import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminVerMedicosPage } from './admin-ver-medicos.page';

const routes: Routes = [
  {
    path: '',
    component: AdminVerMedicosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminVerMedicosPageRoutingModule {}
