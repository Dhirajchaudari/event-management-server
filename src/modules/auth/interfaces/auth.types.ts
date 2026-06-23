export type UserRole = "admin" | "user";

export enum UserRoleEnum {
  admin = "admin",
  user = "user"
}

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
}
