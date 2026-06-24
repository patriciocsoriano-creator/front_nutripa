import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EnfermeriaConfiguracionPage } from './enfermeria-configuracion.page';

const routes: Routes = [
  {
    path: '',
    component: EnfermeriaConfiguracionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EnfermeriaConfiguracionPageRoutingModule {}
