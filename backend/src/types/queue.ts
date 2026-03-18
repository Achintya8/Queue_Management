export interface Queue {
    queue_id: string;
user_id: string;
service_id: number;
counter_id?: number;
token_number: number;
status: 'waiting' | 'called' | 'serving' | 'served' | 'cancelled' | 'no_show';
priority: number;
joined_at: Date;
called_at?: Date;
serving_at?: Date;
completed_at?: Date;
estimated_wait_time?: number;
actual_wait_time?: number;
notes?: string;
}

export interface QueueResponse {
queueId: string;
tokenNumber: number;
position: number;
estimatedWaitTime: number;
estimatedCallTime: string;
qrCode: string; // Base64 encoded QR code or URL
serviceType: string;
status: string;
}

export interface QRCodeData {
queueId: string;
tokenNumber: number;
userId: string;
timestamp: number;
signature: string; // For security
}