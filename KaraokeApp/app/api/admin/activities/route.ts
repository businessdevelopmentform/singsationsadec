import { type NextRequest, NextResponse } from "next/server"
import { DatabaseHelpers } from "@/lib/database-helpers"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uid = searchParams.get("uid")

    if (uid) {
      const activities = await DatabaseHelpers.getActivitiesByUser(uid)
      return NextResponse.json({ activities })
    } else {
      const activities = await DatabaseHelpers.getAllActivities()
      return NextResponse.json({ activities })
    }
  } catch (error) {
    console.error("Error fetching activities:", error)
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid, action, songId, playlistId } = body

    if (!uid || !action) {
      return NextResponse.json({ error: "uid and action are required" }, { status: 400 })
    }

    const activityId = await DatabaseHelpers.createActivity({
      uid,
      action,
      songId,
      playlistId,
      createdAt: new Date(),
    })

    return NextResponse.json({ activityId, message: "Activity created successfully" })
  } catch (error) {
    console.error("Error creating activity:", error)
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 })
  }
}
