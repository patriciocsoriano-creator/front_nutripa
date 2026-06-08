import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PrincipalolvidocontrasenaPage } from './principalolvidocontrasena.page';

const routes: Routes = [
  {
    path: '',
    component: PrincipalolvidocontrasenaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PrincipalolvidocontrasenaPageRoutingModule {}
