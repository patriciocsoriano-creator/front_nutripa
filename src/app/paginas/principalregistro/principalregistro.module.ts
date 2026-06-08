import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PrincipalregistroPageRoutingModule } from './principalregistro-routing.module';

import { PrincipalregistroPage } from './principalregistro.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    PrincipalregistroPageRoutingModule
  ],
  declarations: [PrincipalregistroPage]
})
export class PrincipalregistroPageModule {
  
}

