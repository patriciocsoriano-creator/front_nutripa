import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminReportesGlobalesPage } from './admin-reportes-globales.page';

const routes: Routes = [
  {
    path: '',
    component: AdminReportesGlobalesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminReportesGlobalesPageRoutingModule {}
