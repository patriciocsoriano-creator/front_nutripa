import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MedicoplanesnutricionalescreadosverPageRoutingModule } from './medicoplanesnutricionalescreadosver-routing.module';

import { MedicoplanesnutricionalescreadosverPage } from './medicoplanesnutricionalescreadosver.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MedicoplanesnutricionalescreadosverPageRoutingModule
  ],
  declarations: [MedicoplanesnutricionalescreadosverPage]
})
export class MedicoplanesnutricionalescreadosverPageModule {}
