import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Webhook } from './shared/model';
import { API } from './shared/api-config';

@Injectable({
  providedIn: 'root'
})
export class WebhookService {

  constructor(private http: HttpClient) { }
  list() { return this.http.get<Webhook[]>(API.webhooks); }
  create(w: Webhook) { return this.http.post(API.webhooks, w); }
  update(id: number, w: Webhook) { return this.http.put(`${API.webhooks}/${id}`, w); }
  delete(id: number) { return this.http.delete(`${API.webhooks}/${id}`); }
  test(id: number) { return this.http.post(API.testWebhook(id), {}); }
}
