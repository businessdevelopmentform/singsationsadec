import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth"
import { ref, set, get, push } from "firebase/database"
import { auth, database } from "./firebase"

const API_BASE_URL = "http://129.151.182.215:3000"

const USE_FIREBASE = true // Using Firebase for authentication and database

export interface User {
  id: string // Changed from number to string for Firebase UID
  email: string
  phone?: string
  name?: string
  created_at: string
}

export interface AuthResponse {
  success: boolean
  message: string
  user?: User
  token?: string
}

export interface PurchaseData {
  user_id: number
  song_title: string
  artist_name: string
  category: string
  video_url: string
  amount: number
}

export interface ActivityLog {
  id: string
  userId: number
  eventType: "signup" | "signin" | "song_selection" | "recording_complete" | "payment"
  timestamp: string
  details?: {
    songTitle?: string
    category?: string
    paymentAmount?: number
    [key: string]: any
  }
}

export interface UserReport {
  userId: number
  email: string
  artistName?: string
  totalSignIns: number
  songsSelected: number
  recordingsCompleted: number
  paymentsCompleted: number
  lastActivity: string
  activities: ActivityLog[]
}

class ApiClient {
  private currentFirebaseUser: FirebaseUser | null = null

  constructor() {
    if (typeof window !== "undefined") {
      onAuthStateChanged(auth, (user) => {
        this.currentFirebaseUser = user
        if (user) {
          localStorage.setItem("auth_token", user.uid)
          this.syncUserData(user)
        } else {
          localStorage.removeItem("auth_token")
          localStorage.removeItem("user_data")
        }
      })
    }
  }

  private async syncUserData(firebaseUser: FirebaseUser): Promise<void> {
    try {
      const userRef = ref(database, `users/${firebaseUser.uid}`)
      const snapshot = await get(userRef)

      if (snapshot.exists()) {
        const userData = snapshot.val()
        localStorage.setItem("user_data", JSON.stringify(userData))
      }
    } catch (error) {
      console.error("Error syncing user data:", error)
    }
  }

  private getAuthToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth_token")
    }
    return null
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.getAuthToken()
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private async firebaseSignup(email: string, password: string, phone?: string, name?: string): Promise<AuthResponse> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      const newUser: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        phone,
        name,
        created_at: new Date().toISOString(),
      }

      // Store additional user data in Realtime Database
      await set(ref(database, `users/${firebaseUser.uid}`), newUser)

      localStorage.setItem("auth_token", firebaseUser.uid)
      localStorage.setItem("user_data", JSON.stringify(newUser))

      return {
        success: true,
        message: "Account created successfully!",
        user: newUser,
        token: firebaseUser.uid,
      }
    } catch (error: any) {
      console.error("Firebase signup error:", error)
      return {
        success: false,
        message: this.getFirebaseErrorMessage(error.code),
      }
    }
  }

  private async firebaseSignin(email: string, password: string): Promise<AuthResponse> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      // Get user data from Realtime Database
      const userRef = ref(database, `users/${firebaseUser.uid}`)
      const snapshot = await get(userRef)

      let userData: User
      if (snapshot.exists()) {
        userData = snapshot.val()
      } else {
        // Create user data if it doesn't exist
        userData = {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          created_at: new Date().toISOString(),
        }
        await set(userRef, userData)
      }

      localStorage.setItem("auth_token", firebaseUser.uid)
      localStorage.setItem("user_data", JSON.stringify(userData))

      return {
        success: true,
        message: "Signed in successfully!",
        user: userData,
        token: firebaseUser.uid,
      }
    } catch (error: any) {
      console.error("Firebase signin error:", error)
      return {
        success: false,
        message: this.getFirebaseErrorMessage(error.code),
      }
    }
  }

  private getFirebaseErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case "auth/user-not-found":
        return "No account found with this email address."
      case "auth/wrong-password":
        return "Incorrect password."
      case "auth/email-already-in-use":
        return "An account already exists with this email address."
      case "auth/weak-password":
        return "Password should be at least 6 characters."
      case "auth/invalid-email":
        return "Invalid email address."
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later."
      default:
        return "An error occurred. Please try again."
    }
  }

  private async logActivity(eventType: ActivityLog["eventType"], details?: ActivityLog["details"]): Promise<void> {
    const user = this.getCurrentUser()
    if (!user) return

    const activity: ActivityLog = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id as any, // Convert string to number for compatibility
      eventType,
      timestamp: new Date().toISOString(),
      details,
    }

    try {
      // Store in Firebase Realtime Database
      const activitiesRef = ref(database, `activities/${user.id}`)
      await push(activitiesRef, activity)

      // Also store in localStorage for offline access
      const activities = JSON.parse(localStorage.getItem("user_activities") || "[]")
      activities.push(activity)
      localStorage.setItem("user_activities", JSON.stringify(activities))
    } catch (error) {
      console.error("Failed to log activity:", error)
      // Fallback to localStorage only
      const activities = JSON.parse(localStorage.getItem("user_activities") || "[]")
      activities.push(activity)
      localStorage.setItem("user_activities", JSON.stringify(activities))
    }
  }

  private async performAPISignup(
    email: string,
    password: string,
    phone?: string,
    name?: string,
  ): Promise<AuthResponse> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ email, password, phone, name }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.token) {
        localStorage.setItem("auth_token", data.token)
        localStorage.setItem("user_data", JSON.stringify(data.user))
      }

      return data
    } catch (error) {
      console.error("Signup error:", error)
      console.log("API unavailable, using fallback authentication...")
      return this.fallbackSignup(email, password, phone, name)
    }
  }

  async signup(email: string, password: string, phone?: string, name?: string): Promise<AuthResponse> {
    const result = USE_FIREBASE
      ? await this.firebaseSignup(email, password, phone, name)
      : await this.performAPISignup(email, password, phone, name)

    if (result.success) {
      await this.logActivity("signup", { email, phone, name })
    }

    return result
  }

  private async performAPISignin(email: string, password: string): Promise<AuthResponse> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.token) {
        localStorage.setItem("auth_token", data.token)
        localStorage.setItem("user_data", JSON.stringify(data.user))
      }

      return data
    } catch (error) {
      console.error("Signin error:", error)
      console.log("API unavailable, using fallback authentication...")
      return this.fallbackSignin(email, password)
    }
  }

  async signin(email: string, password: string): Promise<AuthResponse> {
    const result = USE_FIREBASE
      ? await this.firebaseSignin(email, password)
      : await this.performAPISignin(email, password)

    if (result.success) {
      await this.logActivity("signin", { email })
    }

    return result
  }

  async logout(): Promise<void> {
    if (USE_FIREBASE) {
      try {
        await signOut(auth)
      } catch (error) {
        console.error("Firebase logout error:", error)
      }
    } else {
      // Original API logout logic
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: this.getAuthHeaders(),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
      } catch (error) {
        console.error("Logout error:", error)
      }
    }

    // Always clear local storage
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_data")
  }

  async savePurchase(purchaseData: PurchaseData): Promise<{ success: boolean; message: string }> {
    const user = this.getCurrentUser()
    if (!user) {
      return {
        success: false,
        message: "User not authenticated",
      }
    }

    const purchaseWithId = {
      ...purchaseData,
      user_id: user.id,
      id: Date.now(),
      purchased_at: new Date().toISOString(),
    }

    try {
      // Store in Firebase
      if (USE_FIREBASE) {
        const purchasesRef = ref(database, `purchases/${user.id}`)
        await push(purchasesRef, purchaseWithId)
      }

      // Also store locally for offline access
      const purchases = JSON.parse(localStorage.getItem("user_purchases") || "[]")
      purchases.push(purchaseWithId)
      localStorage.setItem("user_purchases", JSON.stringify(purchases))

      return {
        success: true,
        message: "Purchase saved successfully!",
      }
    } catch (error) {
      console.error("Save purchase error:", error)
      // Fallback to localStorage only
      const purchases = JSON.parse(localStorage.getItem("user_purchases") || "[]")
      purchases.push(purchaseWithId)
      localStorage.setItem("user_purchases", JSON.stringify(purchases))

      return {
        success: true,
        message: "Purchase saved locally.",
      }
    }
  }

  getCurrentUser(): User | null {
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem("user_data")
      return userData ? JSON.parse(userData) : null
    }
    return null
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken()
  }

  logSongSelection(songTitle: string, category: string): void {
    this.logActivity("song_selection", { songTitle, category })
  }

  logRecordingComplete(songTitle: string, category: string): void {
    this.logActivity("recording_complete", { songTitle, category })
  }

  logPayment(songTitle: string, category: string, amount: number): void {
    this.logActivity("payment", { songTitle, category, paymentAmount: amount })
  }

  getUserReport(userId?: number): UserReport | null {
    const user = userId ? this.getUserById(userId) : this.getCurrentUser()
    if (!user) return null

    const activities = JSON.parse(localStorage.getItem("user_activities") || "[]")
      .filter((activity: ActivityLog) => activity.userId === user.id)
      .sort((a: ActivityLog, b: ActivityLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const signIns = activities.filter((a: ActivityLog) => a.eventType === "signin").length
    const songSelections = activities.filter((a: ActivityLog) => a.eventType === "song_selection").length
    const recordings = activities.filter((a: ActivityLog) => a.eventType === "recording_complete").length
    const payments = activities.filter((a: ActivityLog) => a.eventType === "payment").length

    return {
      userId: user.id,
      email: user.email,
      artistName: user.name,
      totalSignIns: signIns,
      songsSelected: songSelections,
      recordingsCompleted: recordings,
      paymentsCompleted: payments,
      lastActivity: activities.length > 0 ? activities[0].timestamp : user.created_at,
      activities,
    }
  }

  getAllUserReports(): UserReport[] {
    const users = JSON.parse(localStorage.getItem("fallback_users") || "[]")
    return users.map((user: any) => this.getUserReport(user.id)).filter(Boolean)
  }

  getTopUsers(limit = 10): UserReport[] {
    const reports = this.getAllUserReports()
    return reports
      .map((report) => ({
        ...report,
        totalActivity:
          report.totalSignIns + report.songsSelected + report.recordingsCompleted + report.paymentsCompleted,
      }))
      .sort((a, b) => (b as any).totalActivity - (a as any).totalActivity)
      .slice(0, limit)
  }

  exportUserData(): string {
    const reports = this.getAllUserReports()
    const headers = [
      "User ID",
      "Email",
      "Artist Name",
      "Sign-ins",
      "Songs Selected",
      "Recordings",
      "Payments",
      "Last Activity",
    ]

    const csvContent = [
      headers.join(","),
      ...reports.map((report) =>
        [
          report.userId,
          `"${report.email}"`,
          `"${report.artistName || ""}"`,
          report.totalSignIns,
          report.songsSelected,
          report.recordingsCompleted,
          report.paymentsCompleted,
          `"${new Date(report.lastActivity).toLocaleString()}"`,
        ].join(","),
      ),
    ].join("\n")

    return csvContent
  }

  private getUserById(userId: number): User | null {
    const users = JSON.parse(localStorage.getItem("fallback_users") || "[]")
    const userData = users.find((u: any) => u.id === userId)
    if (!userData) return null

    const { password, ...userWithoutPassword } = userData
    return userWithoutPassword
  }

  private fallbackSignup(email: string, password: string, phone?: string, name?: string): AuthResponse {
    const users = JSON.parse(localStorage.getItem("fallback_users") || "[]")

    // Check if user already exists
    if (users.find((u: any) => u.email === email)) {
      return {
        success: false,
        message: "User already exists with this email.",
      }
    }

    const newUser: User = {
      id: Date.now().toString(),
      email,
      phone,
      name,
      created_at: new Date().toISOString(),
    }

    const userData = { ...newUser, password }
    users.push(userData)
    localStorage.setItem("fallback_users", JSON.stringify(users))

    const token = `fallback_token_${newUser.id}`
    localStorage.setItem("auth_token", token)
    localStorage.setItem("user_data", JSON.stringify(newUser))

    return {
      success: true,
      message: "Account created successfully!",
      user: newUser,
      token,
    }
  }

  private fallbackSignin(email: string, password: string): AuthResponse {
    const users = JSON.parse(localStorage.getItem("fallback_users") || "[]")
    const user = users.find((u: any) => u.email === email && u.password === password)

    if (!user) {
      return {
        success: false,
        message: "Invalid email or password.",
      }
    }

    const { password: _, ...userWithoutPassword } = user
    const token = `fallback_token_${user.id}`
    localStorage.setItem("auth_token", token)
    localStorage.setItem("user_data", JSON.stringify(userWithoutPassword))

    return {
      success: true,
      message: "Signed in successfully!",
      user: userWithoutPassword,
      token,
    }
  }
}

export const apiClient = new ApiClient()
