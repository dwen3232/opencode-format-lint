import fs from "node:fs";
import path from "node:path";

import { CodefmtConfigJsonSchema } from "../src/schemas";

const outputPath = path.join(process.cwd(), "dist", "codefmt.schema.json");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(CodefmtConfigJsonSchema, null, 2)}\n`);
