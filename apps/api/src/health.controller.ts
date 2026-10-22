import { Controller, Get } from "@nestjs/common";

/** Liveness probe for Kubernetes and the e2e test runner. */
@Controller("health")
export class HealthController {
  @Get()
  check(): { status: "ok" } {
    return { status: "ok" };
  }
}
