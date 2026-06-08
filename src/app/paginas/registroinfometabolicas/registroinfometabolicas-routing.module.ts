import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RegistroinfometabolicasPage } from './registroinfometabolicas.page';

const routes: Routes = [
  {
    path: '',
    component: RegistroinfometabolicasPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RegistroinfometabolicasPageRoutingModule {}
