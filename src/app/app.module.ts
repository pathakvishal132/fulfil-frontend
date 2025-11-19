import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component'; // standalone component
import { ProductComponent } from './product/product.component'; // if standalone
import { AppRoutingModule } from './app-routing.module';

@NgModule({
    imports: [
        BrowserModule,
        HttpClientModule,
        AppComponent,
        ProductComponent,
        AppRoutingModule
    ],
    providers: [],
    // only bootstrap the root component
})
export class AppModule { }
