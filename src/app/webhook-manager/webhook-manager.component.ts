
import { Webhook } from '../shared/model';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { WebhookService } from '../webhook.service';
@Component({
  selector: 'app-webhook-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './webhook-manager.component.html',
  styleUrls: ['./webhook-manager.component.css']
})
export class WebhookManagerComponent implements OnInit {
  webhooks: Webhook[] = [];
  editing: Webhook | null = null;
  statusMsg = '';


  constructor(private svc: WebhookService) { }


  ngOnInit() { this.load(); }
  async load() { this.webhooks = await lastValueFrom(this.svc.list()); }


  addNew() { this.editing = { url: '', event: 'product.imported', enabled: true }; }
  startEdit(w: Webhook) { this.editing = { ...w }; }
  async save() {
    if (!this.editing) return;
    if (this.editing.id) await lastValueFrom(this.svc.update(this.editing.id, this.editing));
    else await lastValueFrom(this.svc.create(this.editing));
    this.editing = null;
    await this.load();
  }
  cancel() { this.editing = null; }
  async remove(w: Webhook) { if (!confirm('Delete webhook?')) return; await lastValueFrom(this.svc.delete(w.id!)); await this.load(); }
  async test(w: Webhook) { const resp: any = await lastValueFrom(this.svc.test(w.id!)); this.statusMsg = `Response ${resp?.status || 'ok'} in ${resp?.timeMs || 'n/a'} ms`; setTimeout(() => this.statusMsg = '', 4000); }
}