import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminConfigGeneralPage } from './admin-config-general.page';

const routes: Routes = [
  {
    path: '',
    component: AdminConfigGeneralPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminConfigGeneralPageRoutingModule {}
