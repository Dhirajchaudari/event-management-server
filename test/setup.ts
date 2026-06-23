import "reflect-metadata";

import { resetEnvConfigForTests } from "../src/config/env.js";

process.env.NODE_ENV = "test";

resetEnvConfigForTests();
