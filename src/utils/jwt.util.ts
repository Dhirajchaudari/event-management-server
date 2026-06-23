import { generateKeyPair, importPKCS8, importSPKI, jwtVerify, SignJWT } from "jose";

import { getEnvConfig } from "../config/env.js";
import type { SessionUser } from "../modules/auth/interfaces/auth.types.js";

const JWT_ALG = "RS256";
const JWT_ISSUER = "event-management-server";
const JWT_AUDIENCE = "event-management-client";
const JWT_TTL_SECONDS = 60 * 60 * 24;

interface JwtPayload {
  sub: string;
  email: string;
  role: SessionUser["role"];
}

let cachedKeys: { publicKey: CryptoKey; privateKey: CryptoKey } | null = null;

async function getSigningKeys(): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
  if (cachedKeys) {
    return cachedKeys;
  }

  const env = getEnvConfig();
  if (env.jwtPublicKey && env.jwtPrivateKey) {
    cachedKeys = {
      publicKey: await importSPKI(env.jwtPublicKey, JWT_ALG),
      privateKey: await importPKCS8(env.jwtPrivateKey, JWT_ALG)
    };
    return cachedKeys;
  }

  const pair = await generateKeyPair(JWT_ALG);
  cachedKeys = pair;
  return pair;
}

export function resetJwtKeysForTests(): void {
  cachedKeys = null;
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  const { privateKey } = await getSigningKeys();
  return new SignJWT({
    email: user.email,
    role: user.role
  })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${JWT_TTL_SECONDS}s`)
    .sign(privateKey);
}

export async function verifySessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) {
    return null;
  }

  try {
    const { publicKey } = await getSigningKeys();
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });

    const jwtPayload = payload as unknown as JwtPayload;
    if (!jwtPayload.sub || !jwtPayload.email || !jwtPayload.role) {
      return null;
    }

    return {
      id: jwtPayload.sub,
      email: jwtPayload.email,
      role: jwtPayload.role
    };
  } catch {
    return null;
  }
}
