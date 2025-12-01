import { NextRequest, NextResponse } from "next/server";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const briefRef = doc(db, "users", userId, "data", "brief");
    const snapshot = await getDoc(briefRef);
    
    const brief = snapshot.exists() ? snapshot.data() : null;

    return NextResponse.json({ brief });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Error fetching brief:", error);
    }
    return NextResponse.json({ error: "Failed to fetch brief" }, { status: 500 });
  }
}

