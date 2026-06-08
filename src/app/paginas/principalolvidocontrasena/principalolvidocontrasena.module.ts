import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PrincipalolvidocontrasenaPageRoutingModule } from './principalolvidocontrasena-routing.module';

import { PrincipalolvidocontrasenaPage } from './principalolvidocontrasena.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    PrincipalolvidocontrasenaPageRoutingModule
  ],
  declarations: [PrincipalolvidocontrasenaPage]
})
export class PrincipalolvidocontrasenaPageModule {}
