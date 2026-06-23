import { compare, hash } from "bcryptjs";

import { getEnvConfig } from "../../../config/env.js";
import { signSessionToken } from "../../../utils/jwt.util.js";
import type { SessionUser, UserRole } from "../interfaces/auth.types.js";
import { UserModel } from "../model/user.model.js";
import type { LoginInput, RegisterInput } from "../schema/auth.schema.js";
import { validateEmail, validatePassword, validateRegisterInput } from "../validation/auth.validation.js";

export class AuthService {
  private readonly passwordMinLength: number;

  public constructor(passwordMinLength?: number) {
    this.passwordMinLength = passwordMinLength ?? getEnvConfig().passwordMinLength;
  }

  public async registerWithInput(input: RegisterInput): Promise<SessionUser> {
    const validation = validateRegisterInput(input, this.passwordMinLength);
    if (!validation.ok) {
      throw new Error(validation.message);
    }

    try {
      return await this.register(validation.email, validation.password, input.role ?? "user");
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
        throw new Error("Email is already registered");
      }
      throw error;
    }
  }

  public async loginWithInput(input: LoginInput): Promise<SessionUser> {
    const emailResult = validateEmail(input.email);
    if (!emailResult.ok) {
      throw new Error(emailResult.message);
    }

    const passwordResult = validatePassword(input.password, this.passwordMinLength);
    if (!passwordResult.ok) {
      throw new Error(passwordResult.message);
    }

    try {
      return await this.loginWithPassword(emailResult.value, input.password);
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
        throw new Error("Invalid email or password");
      }
      throw error;
    }
  }

  public async issueSessionToken(user: SessionUser): Promise<string> {
    return signSessionToken(user);
  }

  public async register(email: string, password: string, role: UserRole = "user"): Promise<SessionUser> {
    const existing = await UserModel.findOne({ email }).exec();
    if (existing) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await hash(password, 10);
    const user = await UserModel.create({
      email,
      passwordHash,
      role
    });

    return this.toSessionUser(user);
  }

  public async loginWithPassword(email: string, password: string): Promise<SessionUser> {
    const user = await UserModel.findOne({ email: email.trim().toLowerCase() }).exec();
    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const matches = await compare(password, user.passwordHash);
    if (!matches) {
      throw new Error("INVALID_CREDENTIALS");
    }

    return this.toSessionUser(user);
  }

  public async getUserById(id: string): Promise<SessionUser | null> {
    const user = await UserModel.findById(id).exec();
    if (!user) {
      return null;
    }
    return this.toSessionUser(user);
  }

  private toSessionUser(user: { _id: { toString(): string }; email: string; role: UserRole }): SessionUser {
    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    };
  }
}
