import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PacientemensajesPageRoutingModule } from './pacientemensajes-routing.module';

import { PacienteMensajesPage } from './pacientemensajes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PacientemensajesPageRoutingModule
  ],
  declarations: [PacienteMensajesPage]
})
export class PacientemensajesPageModule {}
