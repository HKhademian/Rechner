import {
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
  toAppId, 
} from "#/apps/appDefinition.ts";
import {
  toLawId, 
} from "#engine/laws/types";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../content/topics");
const articles = join(root, "articles");
const output = join(root, "topics.json");
const sections = ["Potential benefit", "Conditions and limitations", "In the calculators"];

function filesIn(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return filesIn(path);
    }
    return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
  });
}

function readArticle(path: string) {
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n\n# ([^\n]+)\n\n([\s\S]*)$/.exec(text);
  if (!match) {
    throw new Error(`Invalid topic front matter or title: ${path}`);
  }
  const metadata: unknown = JSON.parse(match[1]);
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error(`Invalid topic metadata: ${path}`);
  }
  const data = metadata as Record<string, unknown>;
  const { id, parentId, order, laws, apps, source } = data;
  if (typeof id !== "string" || !/^[a-z0-9-]+$/.test(id) || (parentId !== undefined && (typeof parentId !== "string" || !/^[a-z0-9-]+$/.test(parentId))) || !Number.isSafeInteger(order) || typeof order !== "number" || order < 0 || !Array.isArray(laws) || !laws.every((item) => typeof item === "string") || !Array.isArray(apps) || !apps.every((item) => typeof item === "string")) {
    throw new Error(`Invalid topic metadata fields: ${path}`);
  }
  const expected = [...(parentId ? [parentId] : []), id, "index.md"].join(sep);
  if (relative(articles, path) !== expected) {
    throw new Error(`Topic file must be at ${expected}: ${path}`);
  }
  for (const law of laws) {
    toLawId(law);
  }
  for (const app of apps) {
    toAppId(app);
  }
  let parsedSource: { label: string;
    url: string } | undefined;
  if (source !== undefined) {
    if (!source || typeof source !== "object" || !("label" in source) || !("url" in source) || typeof source.label !== "string" || !source.label.trim() || typeof source.url !== "string" || new URL(source.url).protocol !== "https:") {
      throw new Error(`Invalid topic source: ${path}`);
    }
    parsedSource = { label: source.label,
      url: source.url };
  }
  const parts = match[3].split(/^## (.+)\s*$/m);
  if (parts.length !== 7 || sections.some((heading, index) => parts[1 + 2 * index] !== heading) || [parts[0], parts[2], parts[4], parts[6]].some((part) => !part.trim())) {
    throw new Error(`Invalid topic sections: ${path}`);
  }
  return { order,
    topic: { id,
      ...(parentId ? { parentId } : {}),
      title: match[2],
      description: parts[0].trim(),
      benefit: parts[2].trim(),
      limitation: parts[4].trim(),
      calculatorEffect: parts[6].trim(),
      laws,
      apps,
      ...(parsedSource ? { source: parsedSource } : {}) } };
}

const entries = filesIn(articles).map(readArticle).sort((a, b) => a.order - b.order);
if (entries.length === 0) {
  throw new Error("No topic Markdown files found");
}
if (new Set(entries.map((entry) => entry.topic.id)).size !== entries.length || new Set(entries.map((entry) => entry.order)).size !== entries.length) {
  throw new Error("Duplicate topic ID or order");
}
for (const entry of entries) {
  const parentId = entry.topic.parentId;
  if (parentId && !entries.some((candidate) => candidate.topic.id === parentId && !candidate.topic.parentId)) {
    throw new Error(`Missing top-level parent ${parentId} for ${entry.topic.id}`);
  }
}
const generated = `${JSON.stringify(entries.map((entry) => entry.topic), null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (readFileSync(output, "utf8") !== generated) {
    throw new Error("Topic content is out of date. Run npm run content:topics.");
  }
}
else {
  writeFileSync(output, generated);
}
