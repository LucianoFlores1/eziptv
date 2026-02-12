'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { encrypt, decrypt } from '@/lib/crypto'
import { CREDENTIALS_STORAGE_KEY } from '@/lib/constants'
import {
  xtreamApi,
  type XtreamCredentials,
  type UserInfo,
  type ServerInfo,
} from '@/lib/xtream-api'
import { db } from '@/lib/db'
import React from 'react'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  credentials: XtreamCredentials | null
  userInfo: UserInfo | null
  serverInfo: ServerInfo | null
}

interface AuthContextValue extends AuthState {
  login: (
    server: string,
    username: string,
    password: string
  ) => Promise<void>
  disconnect: () => void
  logout: () => Promise<void>
  checkSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    credentials: null,
    userInfo: null,
    serverInfo: null,
  })

  const login = useCallback(
    async (server: string, username: string, password: string) => {
      const credentials: XtreamCredentials = { server, username, password }
      const { userInfo, serverInfo } = await xtreamApi.authenticate(credentials)

      const encrypted = await encrypt(JSON.stringify(credentials))
      localStorage.setItem(CREDENTIALS_STORAGE_KEY, encrypted)

      setState({
        isAuthenticated: true,
        isLoading: false,
        credentials,
        userInfo,
        serverInfo,
      })
    },
    []
  )

  const disconnect = useCallback(() => {
    setState({
      isAuthenticated: false,
      isLoading: false,
      credentials: null,
      userInfo: null,
      serverInfo: null,
    })
  }, [])

  const logout = useCallback(async () => {
    localStorage.removeItem(CREDENTIALS_STORAGE_KEY)
    try {
      await db.delete()
      await db.open()
    } catch {
      // Ignore delete errors
    }
    setState({
      isAuthenticated: false,
      isLoading: false,
      credentials: null,
      userInfo: null,
      serverInfo: null,
    })
  }, [])

  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      const stored = localStorage.getItem(CREDENTIALS_STORAGE_KEY)
      if (!stored) {
        setState((s) => ({ ...s, isLoading: false }))
        return false
      }

      const decrypted = await decrypt(stored)
      const credentials: XtreamCredentials = JSON.parse(decrypted)
      const { userInfo, serverInfo } = await xtreamApi.authenticate(credentials)

      setState({
        isAuthenticated: true,
        isLoading: false,
        credentials,
        userInfo,
        serverInfo,
      })
      return true
    } catch {
      localStorage.removeItem(CREDENTIALS_STORAGE_KEY)
      setState((s) => ({ ...s, isLoading: false }))
      return false
    }
  }, [])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        ...state,
        login,
        disconnect,
        logout,
        checkSession,
      },
    },
    children
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
