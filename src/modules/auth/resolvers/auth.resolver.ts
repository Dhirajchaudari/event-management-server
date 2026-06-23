import type { FastifyReply } from "fastify";
import { Arg, Ctx, Mutation, Query, Resolver, UseMiddleware } from "type-graphql";

import { isAuthenticated } from "../../../middlewares/authentication.js";
import { getEnvConfig } from "../../../config/env.js";
import type Context from "../../../types/context.type.js";
import { verifySessionToken } from "../../../utils/jwt.util.js";
import { AUTH_SESSION_COOKIE } from "../auth.constants.js";
import type { SessionUser } from "../interfaces/auth.types.js";
import { LoginInput, RegisterInput, SessionUserType } from "../schema/auth.schema.js";
import { AuthService } from "../services/auth.service.js";

const authService = new AuthService();
const env = getEnvConfig();

function getReply(context: Context): FastifyReply {
  const reply = context.reply ?? context.appReply;
  if (!reply) {
    throw new Error("CONTEXT_REPLY_MISSING");
  }
  return reply;
}

function setAuthCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(AUTH_SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production"
  });
}

@Resolver(() => SessionUserType)
export class AuthResolver {
  @Query(() => String)
  public authHealth(): string {
    return "ok";
  }

  @Query(() => SessionUserType, { nullable: true })
  @UseMiddleware(isAuthenticated)
  public me(@Ctx() context: Context): SessionUser | null {
    return context.sessionUser;
  }

  @Mutation(() => SessionUserType)
  public async register(
    @Ctx() context: Context,
    @Arg("input", () => RegisterInput) input: RegisterInput
  ): Promise<SessionUser> {
    const user = await authService.registerWithInput(input);
    const token = await authService.issueSessionToken(user);
    setAuthCookie(getReply(context), token);
    return user;
  }

  @Mutation(() => SessionUserType)
  public async loginWithPassword(
    @Ctx() context: Context,
    @Arg("input", () => LoginInput) input: LoginInput
  ): Promise<SessionUser> {
    const user = await authService.loginWithInput(input);
    const token = await authService.issueSessionToken(user);
    setAuthCookie(getReply(context), token);
    return user;
  }

  @Mutation(() => Boolean)
  public async logout(@Ctx() context: Context): Promise<boolean> {
    getReply(context).clearCookie(AUTH_SESSION_COOKIE, { path: "/" });
    return true;
  }
}

export async function resolveSessionUserFromCookie(token: string | undefined): Promise<SessionUser | null> {
  return verifySessionToken(token);
}
