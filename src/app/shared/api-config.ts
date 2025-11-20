// FILE: src/app/shared/api-config.ts
const BACKEND = 'https://fulfil-backend.vercel.app'

export const API = {
    // Django urls provided in your backend: upload/, upload/status/<job_id>/, products/, products/<id>/, products/bulk-delete/
    upload: `${BACKEND}/upload/`,
    // status endpoint - frontend will append job id: `${API.uploadStatus}/${jobId}/`
    uploadStatus: `${BACKEND}/upload/status`,
    // optional chunk endpoints (if you implement chunking server-side)
    uploadChunk: `${BACKEND}/products/upload-chunk/`,
    uploadFinalize: `${BACKEND}/products/upload-finalize/`,
    products: `${BACKEND}/products/`,
    productsBulkDelete: `${BACKEND}/products/bulk-delete/`,
    webhooks: `${BACKEND}/webhooks/`,
    testWebhook: (id: number) => `${BACKEND}/webhooks/${id}/test/`,
};