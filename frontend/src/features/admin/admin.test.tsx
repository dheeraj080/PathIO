import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { UsersTable } from '@/features/admin/UsersTable'
import { listUsers, deleteUser } from '@/api/users.api'
import { renderWithProviders } from '@/test/utils'
import { tokenStore } from '@/lib/tokenStore'
import { findUserByEmail } from '@/mocks/store'
import {
  accessTokenFor,
  signInAs,
  MOCK_ADMIN_EMAIL,
  MOCK_USER_EMAIL,
} from '@/mocks/fixtures'

describe('admin user management', () => {
  it('prevents an administrator from deleting their own account', async () => {
    signInAs(MOCK_ADMIN_EMAIL)
    renderWithProviders(<UsersTable />)

    const deleteButton = await screen.findByRole('button', {
      name: `Delete ${MOCK_ADMIN_EMAIL}`,
    })
    expect(deleteButton).toBeDisabled()
  })

  it('rejects listing users for a non-admin with 403', async () => {
    tokenStore.set(accessTokenFor(MOCK_USER_EMAIL))
    const error = await listUsers().catch((err: unknown) => err)
    expect((error as { status: number }).status).toBe(403)
  })

  it('rejects admin self-deletion with 403', async () => {
    const admin = findUserByEmail(MOCK_ADMIN_EMAIL)!
    tokenStore.set(accessTokenFor(MOCK_ADMIN_EMAIL))
    await expect(deleteUser(admin.id)).rejects.toMatchObject({ status: 403 })
  })
})
