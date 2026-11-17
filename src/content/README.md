# Reference content

The topic Markdown files supply the text used in search results, popups and full pages. The application bundles generated structured data and does not require a content server.

- `topics/articles/`: each topic has its own directory with an `index.md`. A subtopic has its own directory inside its parent's directory; `parentId` must match the parent directory. The JSON front matter records stable IDs, display order, calculator and law links, and optional sources. The title and four text sections supply the page content.
- `topics/topics.json`: generated from the Markdown files. Do not edit it directly.
- `topics/categories.json`: the directory categories and the order of their top-level topic IDs.
- `laws/laws.json`: law explanations, related laws and external source links, keyed by law ID.
- `laws/groups.json`: explanations and members of law groups, keyed by group ID.

Keep existing IDs stable when editing text: calculators, other content and bookmarked links refer to them. Law, law-group and calculator IDs must match their definitions in the application; adding a new one also requires a corresponding definition. Check the cited official sources when changing a legal explanation.

Write plain text in the title and sections: the current popup and page components display text and do not render rich Markdown formatting. After editing an article, run `npm run content:topics` to refresh the generated file (or restart the development server). `npm run build` also refreshes it. Run `npm run check`; the checks verify that generated content is current and cover references, topic hierarchy and category membership.
