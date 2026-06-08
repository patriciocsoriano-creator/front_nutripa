import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MedicoinformesPage } from './medicoinformes.page';

const routes: Routes = [
  {
    path: '',
    component: MedicoinformesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MedicoinformesPageRoutingModule {}
