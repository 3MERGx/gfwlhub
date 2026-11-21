"use client";

import { useEffect, useState } from "react";
import {
  isSessionSigningOut,
  subscribeSessionSigningOut,
} from "@/lib/session-signout";

export function useSessionSigningOut(): boolean {
  const [signingOut, setSigningOut] = useState(isSessionSigningOut);

  useEffect(() => subscribeSessionSigningOut(setSigningOut), []);

  return signingOut;
}
