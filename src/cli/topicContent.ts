import {
  readdirSync,
  readFileSync,
  mkdirSync,
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
import {
  parseContentLinks,
  resolveContentLink,
} from "#utils/contentLinks";
import {
  ResourceKind,
  resourceId,
} from "#utils/resourceUri";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../content/topics");
const articles = join(root, "articles");
const cache = resolve(root, "../../../.generated");
const output = join(cache, "topics.json");
const categoriesPath = join(root, "categories");
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
  const segments = relative(articles, path).split(sep);
  if ((segments.length !== 2 && segments.length !== 3) || segments.at(-1) !== "index.md") {
    throw new Error(`Invalid topic path: ${path}`);
  }
  const id = segments.at(-2)!;
  const parentId = segments.length === 3 ? segments[0] : undefined;
  const { order, explainedBy, usedBy, related, source, category: categoryUri, categoryOrder } = data;
  if (typeof id !== "string" || !/^[a-z0-9-]+$/.test(id) || (parentId !== undefined && (typeof parentId !== "string" || !/^[a-z0-9-]+$/.test(parentId))) || !Number.isSafeInteger(order) || typeof order !== "number" || order < 0 || !Array.isArray(explainedBy) || !Array.isArray(usedBy) || (related !== undefined && !Array.isArray(related))) {
    throw new Error(`Invalid topic metadata fields: ${path}`);
  }
  const expected = [...(parentId ? [parentId] : []), id, "index.md"].join(sep);
  if (relative(articles, path) !== expected) {
    throw new Error(`Topic file must be at ${expected}: ${path}`);
  }
  if ((!parentId && (categoryUri === undefined || typeof categoryOrder !== "number" || !Number.isSafeInteger(categoryOrder) || categoryOrder < 0)) || (parentId && (categoryUri !== undefined || categoryOrder !== undefined))) {
    throw new Error(`Invalid topic category: ${path}`);
  }
  const category = categoryUri === undefined ? undefined : resourceId(categoryUri, ResourceKind.Category);
  const laws = explainedBy.map((uri) => toLawId(resourceId(uri, ResourceKind.Law)));
  const apps = usedBy.map((uri) => toAppId(resourceId(uri, ResourceKind.App)));
  const relatedTopics = related?.map((uri) => resourceId(uri, ResourceKind.Topic));
  if (new Set(laws).size !== laws.length || new Set(apps).size !== apps.length || (relatedTopics && new Set(relatedTopics).size !== relatedTopics.length)) {
    throw new Error(`Duplicate topic references: ${path}`);
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
    category,
    categoryOrder,
    topic: { id,
      ...(parentId ? { parentId } : {}),
      title: match[2],
      description: parts[0].trim(),
      benefit: parts[2].trim(),
      limitation: parts[4].trim(),
      calculatorEffect: parts[6].trim(),
      laws,
      apps,
      ...(relatedTopics ? { relatedTopics } : {}),
      ...(parsedSource ? { source: parsedSource } : {}) } };
}

const entries = filesIn(articles).map(readArticle).sort((a, b) => a.order - b.order);
if (entries.length === 0) {
  throw new Error("No topic Markdown files found");
}
const categories = filesIn(categoriesPath).map((path) => {
  const segments = relative(categoriesPath, path).split(sep);
  const match = /^---\n([\s\S]*?)\n---\n\n# ([^\n]+)\n\n([^\n]+)\n?$/.exec(readFileSync(path, "utf8").replace(/\r\n/g, "\n"));
  if (segments.length !== 2 || segments[1] !== "index.md" || !/^[a-z0-9-]+$/.test(segments[0]) || !match) {
    throw new Error(`Invalid topic category file: ${path}`);
  }
  const data: unknown = JSON.parse(match[1]);
  if (!data || typeof data !== "object" || !("order" in data) || typeof data.order !== "number" || !Number.isSafeInteger(data.order) || data.order < 0) {
    throw new Error(`Invalid topic category order: ${path}`);
  }
  const members = entries.filter((entry) => entry.category === segments[0]).sort((a, b) => (a.categoryOrder as number) - (b.categoryOrder as number));
  if (!members.length || new Set(members.map((member) => member.categoryOrder)).size !== members.length) {
    throw new Error(`Empty category or duplicate topic order: ${path}`);
  }
  return { order: data.order,
    category: { id: segments[0],
      title: match[2],
      description: match[3],
      topicIds: members.map((member) => member.topic.id) } };
}).sort((a, b) => a.order - b.order);
if (new Set(categories.map((item) => item.order)).size !== categories.length || entries.some((entry) => entry.category && !categories.some((item) => item.category.id === entry.category))) {
  throw new Error("Invalid category membership or order");
}
if (new Set(entries.map((entry) => entry.topic.id)).size !== entries.length || new Set(entries.map((entry) => entry.order)).size !== entries.length) {
  throw new Error("Duplicate topic ID or order");
}
for (const entry of entries) {
  const parentId = entry.topic.parentId;
  if (parentId && !entries.some((candidate) => candidate.topic.id === parentId && !candidate.topic.parentId)) {
    throw new Error(`Missing top-level parent ${parentId} for ${entry.topic.id}`);
  }
  for (const relatedId of entry.topic.relatedTopics ?? []) {
    const target = entries.find((candidate) => candidate.topic.id === relatedId);
    if (!target || target.topic.id === entry.topic.id || (entry.topic.parentId ? target.topic.id !== entry.topic.parentId && target.topic.parentId !== entry.topic.parentId : target.topic.parentId || target.category !== entry.category)) {
      throw new Error(`Related topic ${relatedId} is not a parent or sibling of ${entry.topic.id}`);
    }
  }
  for (const text of [entry.topic.title, entry.topic.description, entry.topic.benefit, entry.topic.limitation, entry.topic.calculatorEffect]) {
    for (const part of parseContentLinks(text)) {
      if (part.target && !resolveContentLink(part.target, entries.map((item) => item.topic), {
        categoryIds: categories.map((item) => item.category.id),
        primaryLawForGroup: (groupId) => {
          const groupPath = resolve(root, "../laws/groups", groupId, "index.md");
          try {
            const header = /^---\n([\s\S]*?)\n---/.exec(readFileSync(groupPath, "utf8").replace(/\r\n/g, "\n"));
            const metadata: unknown = header && JSON.parse(header[1]);
            if (!metadata || typeof metadata !== "object" || !("primaryLaw" in metadata)) {
              return undefined;
            }
            return toLawId(resourceId(metadata.primaryLaw, ResourceKind.Law));
          }
          catch {
            return undefined;
          }
        },
      })) {
        throw new Error(`Invalid link ${part.target} in topic ${entry.topic.id}`);
      }
    }
  }
}
const generated = `${JSON.stringify(entries.map((entry) => entry.topic), null, 2)}\n`;
const generatedCategories = `${JSON.stringify(categories.map((item) => item.category), null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (readFileSync(output, "utf8") !== generated || readFileSync(join(cache, "topic-categories.json"), "utf8") !== generatedCategories) {
    throw new Error("Topic content is out of date. Run npm run content:topics.");
  }
}
else {
  mkdirSync(cache, { recursive: true });
  writeFileSync(output, generated);
  writeFileSync(join(cache, "topic-categories.json"), generatedCategories);
}
