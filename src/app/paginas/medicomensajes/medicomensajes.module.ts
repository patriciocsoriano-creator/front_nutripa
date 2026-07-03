import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MedicomensajesPageRoutingModule } from './medicomensajes-routing.module';

import { MedicoMensajesPage } from './medicomensajes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MedicomensajesPageRoutingModule
  ],
  declarations: [MedicoMensajesPage]
})
export class MedicomensajesPageModule {}
