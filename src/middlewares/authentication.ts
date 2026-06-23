import { type MiddlewareFn } from "type-graphql";

import type Context from "../types/context.type.js";

export const isAuthenticated: MiddlewareFn<Context> = async ({ context }, next) => {
  if (!context.sessionUser) {
    throw new Error("UNAUTHENTICATED");
  }
  return next();
};
