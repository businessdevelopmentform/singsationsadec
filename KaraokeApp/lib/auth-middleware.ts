import type { NextApiRequest, NextApiResponse } from "next"
import { admin } from "./firebase-admin"

export async function verifyToken(req: NextApiRequest, res: NextApiResponse, next: Function) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const idToken = authHeader.split("Bearer ")[1]
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken)
    ;(req as any).uid = decodedToken.uid // attach UID to request
    next()
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" })
  }
}
