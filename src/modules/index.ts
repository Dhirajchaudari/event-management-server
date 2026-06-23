import { authModule } from "./auth/index.js";
import { eventsModule } from "./events/index.js";

export interface ModuleDefinition {
  name: string;
}

export const modules: ModuleDefinition[] = [authModule, eventsModule];
