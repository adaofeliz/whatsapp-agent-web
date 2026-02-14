import { NextResponse } from "next/server";
import { getSessionCookieConfig } from "@/lib/auth/jwt";

export async function POST() {
  const cookieConfig = getSessionCookieConfig();

  const response = NextResponse.json(
    { success: true, message: "Logout successful" },
    { status: 200 }
  );

  response.cookies.set(cookieConfig.name, "", {
    httpOnly: cookieConfig.httpOnly,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    path: cookieConfig.path,
    maxAge: 0,
  });

  return response;
}
