import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CloudinarySignature {
  signature: string;
  timestamp: number;
  api_key: string;
  cloud_name: string;
}

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
}

@Injectable({
  providedIn: 'root'
})
export class VideoUploadService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/video/upload-signature`;

  getSignature(): Observable<CloudinarySignature> {
    return this.http.get<CloudinarySignature>(this.apiUrl);
  }

  uploadVideo(file: File, signatureData: CloudinarySignature): Observable<HttpEvent<CloudinaryUploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signatureData.api_key);
    formData.append('timestamp', signatureData.timestamp.toString());
    formData.append('signature', signatureData.signature);
    formData.append('type', 'authenticated');
    
    const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloud_name}/video/upload`;
    return this.http.post<CloudinaryUploadResponse>(uploadUrl, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }
}
