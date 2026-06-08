import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MedicoseguimientoclinicoPage } from './medicoseguimientoclinico.page';

const routes: Routes = [
  {
    path: '',
    component: MedicoseguimientoclinicoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MedicoseguimientoclinicoPageRoutingModule {}
