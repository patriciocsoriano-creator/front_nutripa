import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MedicoplanesnutricionalescreadosPage } from './medicoplanesnutricionalescreados.page';

const routes: Routes = [
  {
    path: '',
    component: MedicoplanesnutricionalescreadosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MedicoplanesnutricionalescreadosPageRoutingModule {}
