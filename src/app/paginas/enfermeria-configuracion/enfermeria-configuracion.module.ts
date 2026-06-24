import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EnfermeriaConfiguracionPageRoutingModule } from './enfermeria-configuracion-routing.module';

import { EnfermeriaConfiguracionPage } from './enfermeria-configuracion.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    EnfermeriaConfiguracionPageRoutingModule
  ],
  declarations: [EnfermeriaConfiguracionPage]
})
export class EnfermeriaConfiguracionPageModule {}
