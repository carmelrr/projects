export interface MediaAssetDTO {
  id: string;
  storageKey: string;
  mimeType: string;
  fileSize?: number;
  duration?: number;
  status: 'PROCESSING' | 'READY' | 'FAILED' | 'DELETED';
  viewUrl?: string; // presigned
}

export interface UploadUrlResponse {
  uploadUrl: string;
  storageKey: string;
  expiresIn: number;
}
