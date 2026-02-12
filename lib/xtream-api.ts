import { API_TIMEOUT } from './constants'

export interface XtreamCredentials {
  server: string
  username: string
  password: string
}

export interface UserInfo {
  username: string
  password: string
  status: string
  expDate: string
  isTrial: string
  activeCons: string
  createdAt: string
  maxConnections: string
  allowedOutputFormats: string[]
}

export interface ServerInfo {
  url: string
  port: string
  httpsPort: string
  serverProtocol: string
  rtmpPort: string
  timezone: string
  timestampNow: number
  timeNow: string
}

export interface AuthResponse {
  userInfo: UserInfo
  serverInfo: ServerInfo
}

export class XtreamApiError extends Error {
  constructor(
    message: string,
    public code: 'AUTH_FAILED' | 'TIMEOUT' | 'NETWORK' | 'SERVER' | 'UNKNOWN'
  ) {
    super(message)
    this.name = 'XtreamApiError'
  }
}

function normalizeServer(server: string): string {
  let url = server.trim()
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url
  }
  return url.replace(/\/+$/, '')
}

async function apiFetch<T>(
  credentials: XtreamCredentials,
  params: Record<string, string> = {}
): Promise<T> {
  const server = normalizeServer(credentials.server)
  const url = new URL(`${server}/player_api.php`)
  url.searchParams.set('username', credentials.username)
  url.searchParams.set('password', credentials.password)

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new XtreamApiError('Invalid credentials', 'AUTH_FAILED')
      }
      throw new XtreamApiError(`Server error: ${response.status}`, 'SERVER')
    }

    const data = await response.json()

    if (data?.user_info?.auth === 0) {
      throw new XtreamApiError('Authentication failed', 'AUTH_FAILED')
    }

    return data as T
  } catch (error) {
    if (error instanceof XtreamApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new XtreamApiError('Connection timed out', 'TIMEOUT')
    }
    throw new XtreamApiError(
      error instanceof Error ? error.message : 'Network error',
      'NETWORK'
    )
  } finally {
    clearTimeout(timeout)
  }
}

export const xtreamApi = {
  async authenticate(credentials: XtreamCredentials): Promise<AuthResponse> {
    const data = await apiFetch<Record<string, unknown>>(credentials)
    const ui = data.user_info as Record<string, unknown> | undefined
    const si = data.server_info as Record<string, unknown> | undefined

    if (!ui || !si) {
      throw new XtreamApiError('Invalid server response', 'SERVER')
    }

    return {
      userInfo: {
        username: String(ui.username ?? ''),
        password: String(ui.password ?? ''),
        status: String(ui.status ?? ''),
        expDate: String(ui.exp_date ?? ''),
        isTrial: String(ui.is_trial ?? ''),
        activeCons: String(ui.active_cons ?? ''),
        createdAt: String(ui.created_at ?? ''),
        maxConnections: String(ui.max_connections ?? ''),
        allowedOutputFormats: (ui.allowed_output_formats as string[]) ?? [],
      },
      serverInfo: {
        url: String(si.url ?? ''),
        port: String(si.port ?? ''),
        httpsPort: String(si.https_port ?? ''),
        serverProtocol: String(si.server_protocol ?? ''),
        rtmpPort: String(si.rtmp_port ?? ''),
        timezone: String(si.timezone ?? ''),
        timestampNow: Number(si.timestamp_now ?? 0),
        timeNow: String(si.time_now ?? ''),
      },
    }
  },

  async getLiveCategories(credentials: XtreamCredentials) {
    const data = await apiFetch<
      Array<{ category_id: string; category_name: string; parent_id: number }>
    >(credentials, { action: 'get_live_categories' })
    return (data || []).map((c) => ({
      id: String(c.category_id),
      name: c.category_name,
      type: 'live' as const,
      parentId: c.parent_id ? String(c.parent_id) : undefined,
    }))
  },

  async getVodCategories(credentials: XtreamCredentials) {
    const data = await apiFetch<
      Array<{ category_id: string; category_name: string; parent_id: number }>
    >(credentials, { action: 'get_vod_categories' })
    return (data || []).map((c) => ({
      id: String(c.category_id),
      name: c.category_name,
      type: 'vod' as const,
      parentId: c.parent_id ? String(c.parent_id) : undefined,
    }))
  },

  async getSeriesCategories(credentials: XtreamCredentials) {
    const data = await apiFetch<
      Array<{ category_id: string; category_name: string; parent_id: number }>
    >(credentials, { action: 'get_series_categories' })
    return (data || []).map((c) => ({
      id: String(c.category_id),
      name: c.category_name,
      type: 'series' as const,
      parentId: c.parent_id ? String(c.parent_id) : undefined,
    }))
  },

  async getLiveStreams(
    credentials: XtreamCredentials,
    categoryId?: string
  ) {
    const params: Record<string, string> = { action: 'get_live_streams' }
    if (categoryId) params.category_id = categoryId
    const data = await apiFetch<Array<Record<string, unknown>>>(credentials, params)
    return (data || []).map((ch) => ({
      streamId: Number(ch.stream_id),
      name: String(ch.name ?? ''),
      categoryId: String(ch.category_id ?? ''),
      streamIcon: String(ch.stream_icon ?? ''),
      epgChannelId: String(ch.epg_channel_id ?? ''),
      num: Number(ch.num ?? 0),
      added: String(ch.added ?? ''),
    }))
  },

  async getVodStreams(
    credentials: XtreamCredentials,
    categoryId?: string
  ) {
    const params: Record<string, string> = { action: 'get_vod_streams' }
    if (categoryId) params.category_id = categoryId
    const data = await apiFetch<Array<Record<string, unknown>>>(credentials, params)
    return (data || []).map((m) => ({
      streamId: Number(m.stream_id),
      name: String(m.name ?? ''),
      categoryId: String(m.category_id ?? ''),
      streamIcon: String(m.stream_icon ?? ''),
      rating: String(m.rating ?? ''),
      added: String(m.added ?? ''),
      containerExtension: String(m.container_extension ?? 'mp4'),
      plot: m.plot ? String(m.plot) : undefined,
      cast: m.cast ? String(m.cast) : undefined,
      director: m.director ? String(m.director) : undefined,
      genre: m.genre ? String(m.genre) : undefined,
      releaseDate: m.releaseDate ? String(m.releaseDate) : undefined,
      duration: m.duration ? String(m.duration) : undefined,
      durationSecs: m.duration_secs ? Number(m.duration_secs) : undefined,
    }))
  },

  async getSeries(
    credentials: XtreamCredentials,
    categoryId?: string
  ) {
    const params: Record<string, string> = { action: 'get_series' }
    if (categoryId) params.category_id = categoryId
    const data = await apiFetch<Array<Record<string, unknown>>>(credentials, params)
    return (data || []).map((s) => ({
      seriesId: Number(s.series_id),
      name: String(s.name ?? ''),
      categoryId: String(s.category_id ?? ''),
      cover: String(s.cover ?? ''),
      rating: String(s.rating ?? ''),
      plot: String(s.plot ?? ''),
      cast: String(s.cast ?? ''),
      genre: String(s.genre ?? ''),
      releaseDate: s.releaseDate ? String(s.releaseDate) : undefined,
      lastModified: s.last_modified ? String(s.last_modified) : undefined,
    }))
  },

  async getSeriesInfo(
    credentials: XtreamCredentials,
    seriesId: number
  ) {
    const data = await apiFetch<Record<string, unknown>>(credentials, {
      action: 'get_series_info',
      series_id: String(seriesId),
    })

    const seasonsRaw = data.seasons as Array<Record<string, unknown>> | undefined
    const episodesRaw = data.episodes as Record<string, Array<Record<string, unknown>>> | undefined

    const seasons = (seasonsRaw || []).map((s) => ({
      seasonNumber: Number(s.season_number ?? s.episode_count ?? 0),
      name: String(s.name ?? `Season ${s.season_number}`),
      episodeCount: Number(s.episode_count ?? 0),
      cover: s.cover ? String(s.cover) : undefined,
    }))

    const episodes: Record<string, Array<{
      id: string
      episodeNum: number
      title: string
      containerExtension: string
      info?: {
        duration?: string
        durationSecs?: number
        plot?: string
        releaseDate?: string
        rating?: string
        coverBig?: string
      }
    }>> = {}

    if (episodesRaw) {
      for (const [seasonKey, eps] of Object.entries(episodesRaw)) {
        episodes[seasonKey] = (eps || []).map((e) => {
          const info = e.info as Record<string, unknown> | undefined
          return {
            id: String(e.id ?? ''),
            episodeNum: Number(e.episode_num ?? 0),
            title: String(e.title ?? ''),
            containerExtension: String(e.container_extension ?? 'mp4'),
            info: info
              ? {
                  duration: info.duration ? String(info.duration) : undefined,
                  durationSecs: info.duration_secs ? Number(info.duration_secs) : undefined,
                  plot: info.plot ? String(info.plot) : undefined,
                  releaseDate: info.releasedate ? String(info.releasedate) : undefined,
                  rating: info.rating ? String(info.rating) : undefined,
                  coverBig: info.cover_big ? String(info.cover_big) : undefined,
                }
              : undefined,
          }
        })
      }
    }

    return { seriesId, seasons, episodes }
  },

  async getVodInfo(credentials: XtreamCredentials, vodId: number) {
    const data = await apiFetch<Record<string, unknown>>(credentials, {
      action: 'get_vod_info',
      vod_id: String(vodId),
    })
    const info = data.info as Record<string, unknown> | undefined
    const movieData = data.movie_data as Record<string, unknown> | undefined

    return {
      info: info
        ? {
            name: String(info.name ?? ''),
            plot: String(info.plot ?? ''),
            cast: String(info.cast ?? ''),
            director: String(info.director ?? ''),
            genre: String(info.genre ?? ''),
            releaseDate: String(info.releasedate ?? ''),
            duration: String(info.duration ?? ''),
            durationSecs: Number(info.duration_secs ?? 0),
            rating: String(info.rating ?? ''),
            cover: String(info.cover_big ?? info.movie_image ?? ''),
            backdrop: String(info.backdrop_path?.[0] ?? ''),
          }
        : null,
      streamId: movieData ? Number(movieData.stream_id ?? vodId) : vodId,
      containerExtension: movieData
        ? String(movieData.container_extension ?? 'mp4')
        : 'mp4',
    }
  },

  getStreamUrl(
    credentials: XtreamCredentials,
    streamId: number,
    type: 'live' | 'vod' | 'series',
    extension?: string
  ): string {
    const server = normalizeServer(credentials.server)
    const base = `${server}`

    if (type === 'live') {
      return `${base}/live/${credentials.username}/${credentials.password}/${streamId}.m3u8`
    }
    if (type === 'vod') {
      return `${base}/movie/${credentials.username}/${credentials.password}/${streamId}.${extension || 'mp4'}`
    }
    // series episode
    return `${base}/series/${credentials.username}/${credentials.password}/${streamId}.${extension || 'mp4'}`
  },
}
