import { NextResponse } from "next/server";
import { fetchBackend } from "../../gyms/_proxy";

function supportsBatchAddFromStatus(status: number): boolean {
  if (status >= 200 && status < 300) return true;
  if (status === 401 || status === 403) return false;
  if (status === 404 || status === 405 || status === 501) return false;
  return false;
}

export async function GET() {
  const plansProbe = await fetchBackend("/trainer/plans?limit=1");

  return NextResponse.json({
    data: {
      trainerPlans: {
        supportsBatchAddExerciseToPlans: supportsBatchAddFromStatus(plansProbe.status),
      },
    },
  });
}
