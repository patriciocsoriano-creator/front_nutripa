import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminAgregarMedicoPageRoutingModule } from './admin-agregar-medico-routing.module';

import { AdminAgregarMedicoPage } from './admin-agregar-medico.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminAgregarMedicoPageRoutingModule
  ],
  declarations: [AdminAgregarMedicoPage]
})
export class AdminAgregarMedicoPageModule {}
