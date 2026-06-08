import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RegistroinfoantropometricosPageRoutingModule } from './registroinfoantropometricos-routing.module';

import { RegistroinfoantropometricosPage } from './registroinfoantropometricos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RegistroinfoantropometricosPageRoutingModule
  ],
  declarations: [RegistroinfoantropometricosPage]
})
export class RegistroinfoantropometricosPageModule {}
