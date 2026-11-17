import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import {
  dirname,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import {
  fileURLToPath, 
} from "node:url";
import {
  toLawGroupId,
  toLawId,
} from "#engine/laws/types";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../content/laws");
const cache = resolve(root, "../../../.generated");

function compile(folder: string, output: string, validateId: (id: string) => string): void {
  const base = join(root, folder);
  const entries = readdirSync(base, { withFileTypes: true }).map((item) => {
    if (!item.isDirectory()) {
      throw new Error(`Expected a reference directory: ${item.name}`);
    }
    const path = join(base, item.name, "index.md");
    const id = validateId(item.name);
    if (relative(base, path).split(sep).length !== 2) {
      throw new Error(`Invalid reference path: ${path}`);
    }
    const match = /^---\n([\s\S]*?)\n---\n\n# ([^\n]+)\n\n([\s\S]*)$/.exec(readFileSync(path, "utf8").replace(/\r\n/g, "\n"));
    if (!match) {
      throw new Error(`Invalid reference article: ${path}`);
    }
    const data: unknown = JSON.parse(match[1]);
    if (!data || typeof data !== "object" || Array.isArray(data) || !("order" in data) || typeof data.order !== "number" || !Number.isSafeInteger(data.order) || data.order < 0 || "id" in data || "title" in data || "summary" in data || "benefit" in data || "antiBenefit" in data) {
      throw new Error(`Invalid reference metadata: ${path}`);
    }
    const { order, ...metadata } = data;
    const parts = match[3].split(/^## (Benefit|Limitation)\s*$/m);
    if (!parts[0].trim() || parts.length % 2 !== 1) {
      throw new Error(`Invalid reference sections: ${path}`);
    }
    let benefit: string | undefined;
    let antiBenefit: string | undefined;
    for (let index = 1; index < parts.length; index += 2) {
      const value = parts[index + 1].trim();
      if (!value || (parts[index] === "Benefit" && benefit !== undefined) || (parts[index] === "Limitation" && antiBenefit !== undefined)) {
        throw new Error(`Invalid reference section in ${path}`);
      }
      if (parts[index] === "Benefit") {
        benefit = value;
      }
      else {
        antiBenefit = value;
      }
    }
    return { order,
      id,
      record: { id,
        ...metadata,
        title: match[2],
        summary: parts[0].trim(),
        ...(benefit !== undefined ? { benefit } : {}),
        ...(antiBenefit !== undefined ? { antiBenefit } : {}) } };
  }).sort((a, b) => a.order - b.order);
  if (!entries.length || new Set(entries.map((entry) => entry.id)).size !== entries.length || new Set(entries.map((entry) => entry.order)).size !== entries.length) {
    throw new Error(`Empty or duplicate reference entries in ${base}`);
  }
  const result = `${JSON.stringify(Object.fromEntries(entries.map((entry) => [entry.id, entry.record])), null, 2)}\n`;
  const target = join(cache, output);
  if (process.argv.includes("--check")) {
    if (readFileSync(target, "utf8") !== result) {
      throw new Error("Law reference content is out of date. Run npm run content:laws.");
    }
  }
  else {
    mkdirSync(cache, { recursive: true });
    writeFileSync(target, result);
  }
}

compile("articles", "laws.json", toLawId);
compile("groups", "law-groups.json", toLawGroupId);
