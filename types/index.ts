export type SessionStatus = 'PENDING' | 'VERIFYING' | 'VERIFIED' | 'AUTHORIZING' | 'AUTHORIZED' | 'FAILED';

export interface Session {
  id: string;
  status: SessionStatus;

  clientMac: string;
  apMac: string;
  ssid: string;
  site: string;
  redirectUrl: string;

  initialFollowerCount: number;
  verifiedAt?: number;

  failureReason?: string;

  createdAt: number;
  expiresAt: number;
}
