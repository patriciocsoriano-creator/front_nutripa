import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminConfigGeneralPageRoutingModule } from './admin-config-general-routing.module';

import { AdminConfigGeneralPage } from './admin-config-general.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminConfigGeneralPageRoutingModule
  ],
  declarations: [AdminConfigGeneralPage]
})
export class AdminConfigGeneralPageModule {}
