import { eventsModule } from "./events/index.js";

export interface ModuleDefinition {
  name: string;
}

export const modules: ModuleDefinition[] = [eventsModule];
