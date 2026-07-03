import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MedicoMensajesPage } from './medicomensajes.page';

const routes: Routes = [
  {
    path: '',
    component: MedicoMensajesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MedicomensajesPageRoutingModule {}
