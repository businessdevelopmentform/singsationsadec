import { adminDb } from "./firebase-admin"

export interface Activity {
  activityId: string
  uid: string
  action: string
  songId?: string
  playlistId?: string
  createdAt: Date
}

export interface User {
  uid: string
  email?: string
  displayName?: string
  phoneNumber?: string
  createdAt: Date
}

export interface Song {
  songId: string
  title: string
  artist?: string
  duration?: number
  createdAt: Date
}

export interface Playlist {
  playlistId: string
  name: string
  uid: string
  songIds: string[]
  createdAt: Date
}

export class DatabaseHelpers {
  // Activities
  static async createActivity(activity: Omit<Activity, "activityId">): Promise<string> {
    const activityRef = adminDb.ref("activities").push()
    const activityId = activityRef.key!

    await activityRef.set({
      ...activity,
      activityId,
      createdAt: activity.createdAt.toISOString(),
    })

    return activityId
  }

  static async getActivitiesByUser(uid: string): Promise<Activity[]> {
    const snapshot = await adminDb.ref("activities").orderByChild("uid").equalTo(uid).once("value")
    const activities = snapshot.val() || {}

    return Object.values(activities).map((activity: any) => ({
      ...activity,
      createdAt: new Date(activity.createdAt),
    }))
  }

  static async getAllActivities(): Promise<Activity[]> {
    const snapshot = await adminDb.ref("activities").once("value")
    const activities = snapshot.val() || {}

    return Object.values(activities).map((activity: any) => ({
      ...activity,
      createdAt: new Date(activity.createdAt),
    }))
  }

  // Users
  static async createUser(user: User): Promise<void> {
    await adminDb.ref(`users/${user.uid}`).set({
      ...user,
      createdAt: user.createdAt.toISOString(),
    })
  }

  static async getUser(uid: string): Promise<User | null> {
    const snapshot = await adminDb.ref(`users/${uid}`).once("value")
    const userData = snapshot.val()

    if (!userData) return null

    return {
      ...userData,
      createdAt: new Date(userData.createdAt),
    }
  }

  // Songs
  static async createSong(song: Omit<Song, "songId">): Promise<string> {
    const songRef = adminDb.ref("songs").push()
    const songId = songRef.key!

    await songRef.set({
      ...song,
      songId,
      createdAt: song.createdAt.toISOString(),
    })

    return songId
  }

  static async getSong(songId: string): Promise<Song | null> {
    const snapshot = await adminDb.ref(`songs/${songId}`).once("value")
    const songData = snapshot.val()

    if (!songData) return null

    return {
      ...songData,
      createdAt: new Date(songData.createdAt),
    }
  }

  // Playlists
  static async createPlaylist(playlist: Omit<Playlist, "playlistId">): Promise<string> {
    const playlistRef = adminDb.ref("playlists").push()
    const playlistId = playlistRef.key!

    await playlistRef.set({
      ...playlist,
      playlistId,
      createdAt: playlist.createdAt.toISOString(),
    })

    return playlistId
  }

  static async getPlaylist(playlistId: string): Promise<Playlist | null> {
    const snapshot = await adminDb.ref(`playlists/${playlistId}`).once("value")
    const playlistData = snapshot.val()

    if (!playlistData) return null

    return {
      ...playlistData,
      createdAt: new Date(playlistData.createdAt),
    }
  }

  static async getPlaylistsByUser(uid: string): Promise<Playlist[]> {
    const snapshot = await adminDb.ref("playlists").orderByChild("uid").equalTo(uid).once("value")
    const playlists = snapshot.val() || {}

    return Object.values(playlists).map((playlist: any) => ({
      ...playlist,
      createdAt: new Date(playlist.createdAt),
    }))
  }
}
