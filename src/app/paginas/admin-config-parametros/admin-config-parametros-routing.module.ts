import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminConfigParametrosPage } from './admin-config-parametros.page';

const routes: Routes = [
  {
    path: '',
    component: AdminConfigParametrosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminConfigParametrosPageRoutingModule {}
