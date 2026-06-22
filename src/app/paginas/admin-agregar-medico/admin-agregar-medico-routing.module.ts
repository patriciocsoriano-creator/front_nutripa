import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminAgregarMedicoPage } from './admin-agregar-medico.page';

const routes: Routes = [
  {
    path: '',
    component: AdminAgregarMedicoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminAgregarMedicoPageRoutingModule {}
