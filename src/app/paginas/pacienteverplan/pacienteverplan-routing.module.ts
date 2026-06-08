import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PacienteverplanPage } from './pacienteverplan.page';

const routes: Routes = [
  {
    path: '',
    component: PacienteverplanPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PacienteverplanPageRoutingModule {}
