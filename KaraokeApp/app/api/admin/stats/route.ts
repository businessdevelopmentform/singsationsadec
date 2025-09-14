import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Get user count from Firebase Auth
    const listUsersResult = await adminAuth.listUsers()
    const totalUsers = listUsersResult.users.length

    // Get activities data
    const activitiesSnapshot = await adminDb.ref("activities").once("value")
    const allActivities = activitiesSnapshot.val() || {}

    // Calculate stats
    let totalSignups = 0
    let totalSignins = 0
    let totalSongsRecorded = 0
    let totalPurchases = 0

    Object.values(allActivities).forEach((userActivities: any) => {
      if (userActivities) {
        Object.values(userActivities).forEach((activity: any) => {
          if (activity.type === "signup") totalSignups++
          if (activity.type === "signin") totalSignins++
          if (activity.type === "song_recorded") totalSongsRecorded++
          if (activity.type === "purchase") totalPurchases++
        })
      }
    })

    // Get recent signups (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentSignups = listUsersResult.users.filter(
      (user) => new Date(user.metadata.creationTime) > sevenDaysAgo,
    ).length

    const stats = {
      totalUsers,
      totalSignups,
      totalSignins,
      totalSongsRecorded,
      totalPurchases,
      recentSignups,
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
