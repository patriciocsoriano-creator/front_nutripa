import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RegistroinfoantropometricosPage } from './registroinfoantropometricos.page';

const routes: Routes = [
  {
    path: '',
    component: RegistroinfoantropometricosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RegistroinfoantropometricosPageRoutingModule {}
