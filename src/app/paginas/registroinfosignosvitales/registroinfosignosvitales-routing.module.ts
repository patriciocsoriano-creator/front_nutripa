import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RegistroinfosignosvitalesPage } from './registroinfosignosvitales.page';

const routes: Routes = [
  {
    path: '',
    component: RegistroinfosignosvitalesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RegistroinfosignosvitalesPageRoutingModule {}
