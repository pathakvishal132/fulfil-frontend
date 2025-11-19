
// FILE: src/app/products/product-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { ProductService } from '../product-service.service';
import { Product } from '../shared/model';
@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-list.component.html',
  styleUrls: [
    './product-list.component.css', './product-list.component2.css'
  ]
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  page = 1;
  pageSize = 25;
  total = 0;
  filters: any = { sku: '', name: '', active: '' };
  loading = false;
  editing: Product | null = null;

  get totalPages(): number {
    return Math.max(1, Math.ceil((this.total || 0) / (this.pageSize || 25)));
  }

  get pages(): number[] {
    const count = this.totalPages;
    // limit number of buttons shown to 10 for cleanliness
    const maxButtons = 10;
    const start = Math.max(1, Math.min(this.page - Math.floor(maxButtons / 2), Math.max(1, count - maxButtons + 1)));
    const end = Math.min(count, start + maxButtons - 1);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }


  constructor(private svc: ProductService) { }


  ngOnInit() { this.load(); }


  async load() {
    this.loading = true;
    const resp: any = await lastValueFrom(this.svc.list(this.page, this.pageSize, this.filters));
    this.products = resp.rows || [];
    this.total = resp.total || 0;
    this.loading = false;
  }


  startEdit(p: Product) { this.editing = { ...p }; }
  openCreate() {
    this.editing = { sku: '', name: '', description: '', active: true } as Product;
  }
  async saveEdit() {
    if (!this.editing) return;
    try {
      if (this.editing.id) {
        await lastValueFrom(this.svc.update(this.editing.id, this.editing));
      } else {
        await lastValueFrom(this.svc.create(this.editing));
      }
    } finally {
      this.editing = null;
      await this.load();
    }
  }


  cancelEdit() { this.editing = null; }

  clearFilters() {
    this.filters = { sku: '', name: '', active: '' };
    this.page = 1;
    this.load();
  }


  async deleteOne(p: Product) {
    if (!confirm(`Delete ${p.sku}? This cannot be undone.`)) return;
    await lastValueFrom(this.svc.delete(p.id!));
    await this.load();
  }


  async bulkDelete() {
    if (!confirm('Are you sure? This will delete ALL products. This cannot be undone.')) return;
    await lastValueFrom(this.svc.bulkDelete());
    await this.load();
  }
}
