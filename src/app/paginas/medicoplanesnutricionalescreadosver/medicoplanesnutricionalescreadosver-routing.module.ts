import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MedicoplanesnutricionalescreadosverPage } from './medicoplanesnutricionalescreadosver.page';

const routes: Routes = [
  {
    path: '',
    component: MedicoplanesnutricionalescreadosverPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MedicoplanesnutricionalescreadosverPageRoutingModule {}
