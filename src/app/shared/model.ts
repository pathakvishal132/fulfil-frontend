export interface Product {
    id?: number;
    sku: string;
    name: string;
    description?: string;
    active?: boolean;
    createdAt?: string;
}


export interface Webhook {
    id?: number;
    url: string;
    event: string;
    enabled: boolean;
}