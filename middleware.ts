import { NextResponse } from "next/server";
import { auth } from "@/auth-middleware";

export default auth((req) => {
  return NextResponse.next();
});
