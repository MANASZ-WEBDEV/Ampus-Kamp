import { apiClient } from '@/lib/apiClient';
import type {
  Course,
  Credential,
  Participation,
  CreateCredentialInput,
  EditCredentialInput,
  VerifyCredentialInput,
  CreateParticipationInput,
  VerifyParticipationInput,
} from '../types';

// ── Courses ───────────────────────────────────────────────────────────────────

/** GET /api/v1/courses?q=&category= — search course catalog */
export async function searchCourses(q?: string, category?: string): Promise<Course[]> {
  const res = await apiClient.get<{ data: Course[] }>('/courses', {
    params: { q, category },
  });
  return res.data.data;
}

// ── Credentials ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/credentials — upload credential as multipart/form-data.
 * Uses FormData so the proof file is sent correctly.
 */
export async function createCredential(input: CreateCredentialInput): Promise<Credential> {
  const form = new FormData();
  if (input.courseId)        form.append('courseId',        input.courseId);
  if (input.otherCourseName) form.append('otherCourseName', input.otherCourseName);
  form.append('issuer',        input.issuer);
  form.append('session',       input.session);
  form.append('year',          String(input.year));
  form.append('tier',          input.tier);
  form.append('certificateId', input.certificateId);
  form.append('proof',         input.proof);   // File — triggers multipart

  const res = await apiClient.post<{ data: Credential }>('/credentials', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

/** GET /api/v1/credentials/me — student's own credentials (newest first) */
export async function getMyCredentials(): Promise<Credential[]> {
  const res = await apiClient.get<{ data: Credential[] }>('/credentials/me');
  return res.data.data;
}

/** GET /api/v1/credentials/pending — faculty dept queue (oldest first) */
export async function getPendingCredentials(): Promise<Credential[]> {
  const res = await apiClient.get<{ data: Credential[] }>('/credentials/pending');
  return res.data.data;
}

/** PATCH /api/v1/credentials/:id — student edits pending credential */
export async function editCredential(
  credentialId: string,
  input: EditCredentialInput,
): Promise<Credential> {
  const res = await apiClient.patch<{ data: Credential }>(
    `/credentials/${credentialId}`,
    input,
  );
  return res.data.data;
}

/** PATCH /api/v1/credentials/:id/verify — faculty approves / rejects */
export async function verifyCredential(
  credentialId: string,
  input: VerifyCredentialInput,
): Promise<Credential> {
  const res = await apiClient.patch<{ data: Credential }>(
    `/credentials/${credentialId}/verify`,
    input,
  );
  return res.data.data;
}

// ── Participations ────────────────────────────────────────────────────────────

/** POST /api/v1/participations — upload participation proof */
export async function createParticipation(
  input: CreateParticipationInput,
): Promise<Participation> {
  const form = new FormData();
  form.append('eventId', input.eventId);
  if (input.registrationId) form.append('registrationId', input.registrationId);
  if (input.teamName)        form.append('teamName',       input.teamName);
  if (input.members)         form.append('members',        JSON.stringify(input.members));
  form.append('result',  input.result);
  if (input.resultNote) form.append('resultNote', input.resultNote);
  form.append('proof', input.proof);

  const res = await apiClient.post<{ data: Participation }>('/participations', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

/** PATCH /api/v1/participations/:id/verify — faculty approves / rejects */
export async function verifyParticipation(
  participationId: string,
  input: VerifyParticipationInput,
): Promise<Participation> {
  const res = await apiClient.patch<{ data: Participation }>(
    `/participations/${participationId}/verify`,
    input,
  );
  return res.data.data;
}
