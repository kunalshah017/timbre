export type Recording = {
  id: number
  title: string
  mime_type: 'audio/webm' | 'audio/mp4'
  size_bytes: number
  duration_ms: number
  created_at: string
  audio_url: string
}

type ApiResponse<T> = { data: T }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.errors?.audio?.[0] ?? body?.errors?.title?.[0] ?? 'Something went wrong.')
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function listRecordings(): Promise<Recording[]> {
  const response = await request<ApiResponse<Recording[]>>('/api/recordings')
  return response.data
}

export async function createRecording(audio: Blob, durationMs: number): Promise<Recording> {
  const form = new FormData()
  const extension = audio.type === 'audio/mp4' ? 'm4a' : 'webm'
  form.append('audio', audio, `recording.${extension}`)
  form.append('duration_ms', String(durationMs))
  form.append('title', localRecordingTitle())

  const response = await request<ApiResponse<Recording>>('/api/recordings', {
    method: 'POST',
    body: form,
  })
  return response.data
}

export async function renameRecording(id: number, title: string): Promise<Recording> {
  const response = await request<ApiResponse<Recording>>(`/api/recordings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  return response.data
}

export function deleteRecording(id: number): Promise<void> {
  return request<void>(`/api/recordings/${id}`, { method: 'DELETE' })
}
import { localRecordingTitle } from '../lib/recording-title'
