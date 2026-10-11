import { NextRequest } from 'next/server'

export interface UserSession {
  sub: number
  employeeId: number
  employeeNumber: string
  fullName: string
  role: string
  email: string
}

// Single-tenant HR Admin bypass session (admin tanpa login)
export const DEFAULT_HR_ADMIN_SESSION: UserSession = {
  sub: 6,
  employeeId: 6,
  employeeNumber: 'EMP-2024-006',
  fullName: 'Nining Ratnasari',
  role: 'hr_admin',
  email: 'nining@maju.co.id'
}

export async function getRoleFromRequest(req?: NextRequest): Promise<string> {
  // Always return hr_admin for "admin HR tanpa login" mode
  return DEFAULT_HR_ADMIN_SESSION.role
}

export async function getSessionFromRequest(req?: NextRequest): Promise<UserSession> {
  return DEFAULT_HR_ADMIN_SESSION
}
