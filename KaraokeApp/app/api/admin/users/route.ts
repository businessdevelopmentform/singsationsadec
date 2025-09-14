import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Get all users from Firebase Auth
    const listUsersResult = await adminAuth.listUsers()

    // Get user data from Realtime Database
    const usersSnapshot = await adminDb.ref("users").once("value")
    const usersData = usersSnapshot.val() || {}

    // Combine auth and database data
    const users = listUsersResult.users.map((user) => ({
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      creationTime: user.metadata.creationTime,
      lastSignInTime: user.metadata.lastSignInTime,
      ...usersData[user.uid],
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { uid } = await request.json()

    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 })
    }

    // Delete user from Firebase Auth
    await adminAuth.deleteUser(uid)

    // Delete user data from Realtime Database
    await adminDb.ref(`users/${uid}`).remove()
    await adminDb.ref(`activities/${uid}`).remove()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
