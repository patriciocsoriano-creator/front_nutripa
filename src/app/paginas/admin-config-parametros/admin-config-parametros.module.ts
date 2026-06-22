import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminConfigParametrosPageRoutingModule } from './admin-config-parametros-routing.module';

import { AdminConfigParametrosPage } from './admin-config-parametros.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminConfigParametrosPageRoutingModule
  ],
  declarations: [AdminConfigParametrosPage]
})
export class AdminConfigParametrosPageModule {}
