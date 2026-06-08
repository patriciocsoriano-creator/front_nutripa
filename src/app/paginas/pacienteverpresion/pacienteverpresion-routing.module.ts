import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PacienteverpresionPage } from './pacienteverpresion.page';

const routes: Routes = [
  {
    path: '',
    component: PacienteverpresionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PacienteverpresionPageRoutingModule {}
