// Types index - express types are augmented via express.d.ts

export type AppRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface JWTPayload {
  id: string;
  sub: string;
  role: AppRole;
  iat: number;
  exp: number;
}
