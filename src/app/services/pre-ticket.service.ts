import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpParams
} from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { PreTicketResponse } from '../models/pre-ticket-response';

@Injectable({
  providedIn: 'root'
})
export class PreTicketService {
  private readonly endpoint =
    `${environment.libraApiUrl}/api/v1/pre-tickets`;

  constructor(
    private readonly http: HttpClient
  ) {}

  buscarPreTicket(
    cdUnidadeBalanca: number,
    placa: string
  ): Observable<PreTicketResponse> {
    const params = new HttpParams()
      .set(
        'cdUnidadeBalanca',
        cdUnidadeBalanca.toString()
      )
      .set(
        'placa',
        placa.trim()
      );

    const headers = new HttpHeaders()
      .set(
        'x-api-key',
        environment.libraApiKey
      );

    return this.http.get<PreTicketResponse>(
      this.endpoint,
      {
        params,
        headers
      }
    );
  }
}