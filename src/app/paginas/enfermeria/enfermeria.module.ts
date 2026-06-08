import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EnfermeriaPageRoutingModule } from './enfermeria-routing.module';

import { EnfermeriaPage } from './enfermeria.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EnfermeriaPageRoutingModule
  ],
  declarations: [EnfermeriaPage]
})
export class EnfermeriaPageModule {}
