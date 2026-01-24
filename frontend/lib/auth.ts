export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
}

export interface AuthResponse {
  token: string
  user: User
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error('Invalid credentials')
  }

  const data = await response.json()
  
  // Store token and user info
  localStorage.setItem('token', data.token)
  localStorage.setItem('user', JSON.stringify(data.user))
  
  return data
}

export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/login'
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem('user')
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}

export function isAdmin(): boolean {
  const user = getUser()
  return user?.role === 'admin'
}

export async function verifyToken(): Promise<boolean> {
  const token = getToken()
  if (!token) return false

  try {
    const response = await fetch(`${API_URL}/api/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    return response.ok
  } catch {
    return false
  }
}
