import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PacienteconfiguracionPageRoutingModule } from './pacienteconfiguracion-routing.module';

import { PacienteconfiguracionPage } from './pacienteconfiguracion.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PacienteconfiguracionPageRoutingModule
  ],
  declarations: [PacienteconfiguracionPage]
})
export class PacienteconfiguracionPageModule {}
