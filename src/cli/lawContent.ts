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
import {
  ResourceKind,
  resourceId,
} from "#utils/resourceUri";

const relationTypes = {
  dependsOn: "depends_on",
  modifies: "modifies",
  extends: "extends",
  offsets: "offsets",
  interactsWith: "interacts_with",
  contrastsWith: "contrasts_with",
  implements: "implements",
} as const;

function lawMetadata(metadata: Record<string, unknown>, path: string): Record<string, unknown> {
  const { group, ...rest } = metadata;
  const related = new Map<string, { relationType: string;
    description?: string }>();
  const order = new Map<string, number>();
  for (const [intent, relationType] of Object.entries(relationTypes)) {
    const map = rest[intent];
    delete rest[intent];
    if (map === undefined) {
      continue;
    }
    if (!map || typeof map !== "object" || Array.isArray(map)) {
      throw new Error(`Invalid ${intent} relationships in ${path}`);
    }
    for (const [uri, details] of Object.entries(map)) {
      const target = toLawId(resourceId(uri, ResourceKind.Law));
      if (related.has(target) || !details || typeof details !== "object" || Array.isArray(details) || Object.keys(details).some((key) => key !== "description" && key !== "order") || ("description" in details && typeof details.description !== "string") || ("order" in details && (typeof details.order !== "number" || !Number.isSafeInteger(details.order) || details.order < 0))) {
        throw new Error(`Invalid or duplicate relationship ${uri} in ${path}`);
      }
      const { order: position, ...description } = details;
      if (typeof position === "number") {
        order.set(target, position);
      }
      related.set(target, { relationType,
        ...description });
    }
  }
  const ordered = [...related.keys()];
  if (order.size) {
    if (order.size !== related.size || new Set(order.values()).size !== order.size) {
      throw new Error(`Relationship order must be unique and complete in ${path}`);
    }
    ordered.sort((a, b) => order.get(a)! - order.get(b)!);
  }
  return { ...rest,
    ...(group === undefined ? {} : { groupId: toLawGroupId(resourceId(group, ResourceKind.Group)) }),
    relatedLaws: Object.fromEntries(ordered.map((id) => [id, related.get(id)])) };
}

function groupMetadata(metadata: Record<string, unknown>, path: string): Record<string, unknown> {
  const { primaryLaw, includes, ...rest } = metadata;
  if (!Array.isArray(includes)) {
    throw new Error(`Invalid group members in ${path}`);
  }
  const memberLawIds = includes.map((uri) => toLawId(resourceId(uri, ResourceKind.Law)));
  const primaryLawId = toLawId(resourceId(primaryLaw, ResourceKind.Law));
  if (new Set(memberLawIds).size !== memberLawIds.length || !memberLawIds.includes(primaryLawId)) {
    throw new Error(`Invalid or duplicate group membership in ${path}`);
  }
  return { ...rest,
    primaryLawId,
    memberLawIds };
}

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
    const { order, ...authoredMetadata } = data;
    const metadata = folder === "articles" ? lawMetadata(authoredMetadata, path) : groupMetadata(authoredMetadata, path);
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
