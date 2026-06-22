import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminAuditoriaPageRoutingModule } from './admin-auditoria-routing.module';

import { AdminAuditoriaPage } from './admin-auditoria.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminAuditoriaPageRoutingModule
  ],
  declarations: [AdminAuditoriaPage]
})
export class AdminAuditoriaPageModule {}
