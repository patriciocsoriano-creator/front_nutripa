import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MedicoverregistroPage } from './medicoverregistro.page';

const routes: Routes = [
  {
    path: '',
    component: MedicoverregistroPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MedicoverregistroPageRoutingModule {}
