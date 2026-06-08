import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MedicocrearplanPage } from './medicocrearplan.page';

const routes: Routes = [
  {
    path: '',
    component: MedicocrearplanPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MedicocrearplanPageRoutingModule {}
