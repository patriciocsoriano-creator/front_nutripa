import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MedicoplanalimenticioPage } from './medicoplanalimenticio.page';

const routes: Routes = [
  {
    path: '',
    component: MedicoplanalimenticioPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MedicoplanalimenticioPageRoutingModule {}
