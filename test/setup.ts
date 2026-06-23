import "reflect-metadata";

import { resetEnvConfigForTests } from "../src/config/env.js";
import { resetJwtKeysForTests } from "../src/utils/jwt.util.js";

process.env.NODE_ENV = "test";

resetEnvConfigForTests();
resetJwtKeysForTests();
