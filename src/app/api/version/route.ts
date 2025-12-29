import { NextResponse } from "next/server"
import { getVersionInfo, VERSION_HISTORY } from "@/lib/version"

export async function GET() {
  try {
    const versionInfo = getVersionInfo();
    
    return NextResponse.json({
      ...versionInfo,
      history: VERSION_HISTORY,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to get version info',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}