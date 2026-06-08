import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PacienteregistrarglucosaPage } from './pacienteregistrarglucosa.page';

const routes: Routes = [
  {
    path: '',
    component: PacienteregistrarglucosaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PacienteregistrarglucosaPageRoutingModule {}
