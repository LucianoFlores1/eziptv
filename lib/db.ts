import Dexie, { type EntityTable } from 'dexie'

export interface Category {
  id: string
  name: string
  type: 'live' | 'vod' | 'series'
  parentId?: string
}

export interface Channel {
  streamId: number
  name: string
  categoryId: string
  streamIcon: string
  epgChannelId: string
  num: number
  added: string
}

export interface Movie {
  streamId: number
  name: string
  categoryId: string
  streamIcon: string
  rating: string
  added: string
  containerExtension: string
  plot?: string
  cast?: string
  director?: string
  genre?: string
  releaseDate?: string
  duration?: string
  durationSecs?: number
}

export interface Series {
  seriesId: number
  name: string
  categoryId: string
  cover: string
  rating: string
  plot: string
  cast: string
  genre: string
  releaseDate?: string
  lastModified?: string
}

export interface SeriesInfo {
  seriesId: number
  seasons: SeriesSeason[]
  episodes: Record<string, SeriesEpisode[]>
}

export interface SeriesSeason {
  seasonNumber: number
  name: string
  episodeCount: number
  cover?: string
}

export interface SeriesEpisode {
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
}

export interface Favorite {
  id?: number
  contentId: number
  contentType: 'live' | 'vod' | 'series'
  addedAt: number
}

export interface PlaybackState {
  id?: number
  contentId: number
  contentType: 'live' | 'vod' | 'series'
  position: number
  duration: number
  watchedAt: number
  completed: boolean
}

export interface SyncMeta {
  key: string
  value: string
  updatedAt: number
}

class OTTDatabase extends Dexie {
  categories!: EntityTable<Category, 'id'>
  channels!: EntityTable<Channel, 'streamId'>
  movies!: EntityTable<Movie, 'streamId'>
  series!: EntityTable<Series, 'seriesId'>
  seriesInfo!: EntityTable<SeriesInfo, 'seriesId'>
  favorites!: EntityTable<Favorite, 'id'>
  playbackState!: EntityTable<PlaybackState, 'id'>
  syncMeta!: EntityTable<SyncMeta, 'key'>

  constructor() {
    super('ott-player-db')

    this.version(1).stores({
      categories: 'id, type, [type+name]',
      channels: 'streamId, categoryId, name, [categoryId+name]',
      movies: 'streamId, categoryId, name, rating, [categoryId+name]',
      series: 'seriesId, categoryId, name, [categoryId+name]',
      seriesInfo: 'seriesId',
      favorites: '++id, [contentId+contentType], contentType',
      playbackState: '++id, [contentId+contentType], watchedAt',
      syncMeta: 'key',
    })
  }
}

export const db = new OTTDatabase()
