import { apiRequest } from '@/lib/api'
import type { UserDTO } from '@/types/api'

/** Admin-only: list all users. */
export function listUsers(): Promise<UserDTO[]> {
  return apiRequest<UserDTO[]>('/api/v1/users')
}

/** Admin-only: create a user (local provider). */
export function createUser(payload: Partial<UserDTO> & { password?: string }): Promise<UserDTO> {
  return apiRequest<UserDTO>('/api/v1/users', { method: 'POST', body: payload })
}

/** Admin or self: read a user. */
export function getUser(userId: string): Promise<UserDTO> {
  return apiRequest<UserDTO>(`/api/v1/users/${encodeURIComponent(userId)}`)
}

/** Admin or self: update a user. */
export function updateUser(userId: string, payload: Partial<UserDTO>): Promise<UserDTO> {
  return apiRequest<UserDTO>(`/api/v1/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: payload,
  })
}

/** Admin-only: delete a user. Admins cannot delete themselves (403). */
export function deleteUser(userId: string): Promise<void> {
  return apiRequest<void>(`/api/v1/users/${encodeURIComponent(userId)}`, { method: 'DELETE' })
}
