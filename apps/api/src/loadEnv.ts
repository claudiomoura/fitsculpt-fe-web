import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(currentDir, "..");

dotenv.config({ path: path.join(apiRoot, ".env") });
dotenv.config({ path: path.join(apiRoot, ".env.local"), override: true });
