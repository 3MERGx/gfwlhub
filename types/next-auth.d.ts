import "next-auth";
import { UserRole, UserStatus } from "./crowdsource";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: UserRole;
      status: UserStatus;
      submissionsCount: number;
      approvedCount: number;
      rejectedCount: number;
    };
    error?: "SessionInvalidated" | "SessionExpired";
  }

  interface User {
    id: string;
    email: string;
    name: string;
    image?: string;
    role: UserRole;
    status: UserStatus;
    submissionsCount: number;
    approvedCount: number;
    rejectedCount: number;
  }
}

