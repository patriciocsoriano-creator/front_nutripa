import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EnfermeriaReportesPage } from './enfermeria-reportes.page';

const routes: Routes = [
  {
    path: '',
    component: EnfermeriaReportesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EnfermeriaReportesPageRoutingModule {}
