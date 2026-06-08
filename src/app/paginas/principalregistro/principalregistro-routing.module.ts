import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PrincipalregistroPage } from './principalregistro.page';

const routes: Routes = [
  {
    path: '',
    component: PrincipalregistroPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PrincipalregistroPageRoutingModule {}
