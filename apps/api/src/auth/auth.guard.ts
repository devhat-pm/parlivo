import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../config.js";
import { verifyAccessToken } from "./access-token.js";

/** The subset of the HTTP request this guard needs (avoids depending on Express types). */
interface AuthenticatedRequest {
  headers: { authorization?: string | undefined };
  userId?: string;
}

/** Requires a valid Bearer access token and exposes its user ID to the handler. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization ?? "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) throw new UnauthorizedException();
    const userId = await verifyAccessToken(token, this.config.jwtSecret);
    if (!userId) throw new UnauthorizedException();
    request.userId = userId;
    return true;
  }
}

export const CurrentUserId = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.userId) throw new UnauthorizedException();
  return request.userId;
});
