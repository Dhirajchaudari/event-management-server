import type { FastifyReply, FastifyRequest } from "fastify";

export default interface Context {
  request: FastifyRequest;
  reply: FastifyReply;
}
