import { connection } from "next/server";

export async function requestNow(): Promise<Date> {
  await connection();
  return new Date();
}
