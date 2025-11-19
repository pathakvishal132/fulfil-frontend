import { Routes } from '@angular/router';
import { ProductComponent } from './product/product.component';
import { ProductListComponent } from './product-list/product-list.component';
import { WebhookManagerComponent } from './webhook-manager/webhook-manager.component';

export const routes: Routes = [
    { path: '', redirectTo: 'products', pathMatch: 'full' },
    { path: 'products', component: ProductComponent },
    { path: 'products/list', component: ProductListComponent },
    { path: 'webhooks', component: WebhookManagerComponent },
    { path: '**', redirectTo: 'products' }
];
