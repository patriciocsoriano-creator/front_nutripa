import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PacienteverglucosaPage } from './pacienteverglucosa.page';

const routes: Routes = [
  {
    path: '',
    component: PacienteverglucosaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PacienteverglucosaPageRoutingModule {}
