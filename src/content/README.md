# Reference content

The reference pages and calculator help use structured JSON so the same text can appear in search results, popups and full pages. The files are bundled with the application; they do not require a server or an additional content build step.

- `topics/topics.json`: topic and subtopic text, calculator links, law links and optional sources. `parentId` places a subtopic under its parent.
- `topics/categories.json`: the directory categories and the order of their top-level topic IDs.
- `laws/laws.json`: law explanations, related laws and external source links, keyed by law ID.
- `laws/groups.json`: explanations and members of law groups, keyed by group ID.

Keep existing IDs stable when editing text: calculators, other content and bookmarked links refer to them. Law, law-group and calculator IDs must match their definitions in the application; adding a new one also requires a corresponding definition. Check the cited official sources when changing a legal explanation.

After editing, run `npm run check` and `npm run build`. The checks cover references, topic hierarchy, category membership and registry content.
