import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API } from './shared/api-config';
import { Product } from './shared/model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private http: HttpClient) { }
  list(page = 1, pageSize = 25, filters: any = {}) {
    let params = new HttpParams().set('page', String(page)).set('pageSize', String(pageSize));
    Object.keys(filters).forEach(k => {
      if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') params = params.set(k, filters[k]);
    });
    return this.http.get<{ rows: Product[], total: number }>(API.products, { params });
  }
  create(product: Product) { return this.http.post<Product>(API.products, product); }
  update(id: number | string, product: Partial<Product>) {
    // API.products already ends with a slash; avoid double-slash when appending id
    const url = `${API.products}${id}/`;
    return this.http.put<Product>(url, product);
  }

  delete(id: number | string) {
    const url = `${API.products}${id}/`;
    return this.http.delete(url);
  }
  // Use HTTP DELETE for bulk-delete endpoint to match backend expectations
  bulkDelete() { return this.http.delete(API.productsBulkDelete); }
}
