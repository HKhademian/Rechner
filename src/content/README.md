# Reference content

The topic Markdown files supply the text used in search results, popups and full pages. The application bundles generated structured data and does not require a content server.

- `topics/articles/`: each topic has its own directory with an `index.md`. A subtopic has its own directory inside its parent's directory. The path supplies the topic ID and parent; JSON front matter records display order, category, calculator and law links, and optional sources. The title and four text sections supply the page content.
- `topics/categories/`: one Markdown file per directory category, with its title, description and order. Top-level topic front matter assigns category membership and order.
- `laws/articles/`: one directory per law, with an `index.md` for its explanation and reference metadata.
- `laws/groups/`: one directory per law group, with its explanation and membership in `index.md`.

Keep existing IDs stable when editing text: calculators, other content and bookmarked links refer to them. Law, law-group and calculator IDs must match their definitions in the application; adding a new one also requires a corresponding definition. Check the cited official sources when changing a legal explanation.

Use inline Markdown links in the section text to connect explanations:

- `[Home Purchase Planner](rechner://app/housing)` links to a calculator.
- `[KfW 300](rechner://law/kfw-300)` opens the law reference popup, with a normal law-page URL for modified clicks.
- `[Loan-to-value](rechner://topic/mortgage-repayment/loan-to-value)` links to a topic or subtopic. Top-level topics use `rechner://topic/topic-id`.
- `rechner://app/app-id/section-id` and `rechner://law/law-id/section-id` link to a section anchor. Standard `https://` and `http://` links also work.

These `rechner://` targets are content identifiers; the app renders them as its normal components and web URLs. The generator validates target IDs, but section anchors must be checked on their destination pages. JSON metadata continues to define indexing and related references independently. Other rich Markdown formatting is not rendered yet.

After editing content, run `npm run content:all` to refresh the disposable `.generated/` build cache (or restart the development server). Builds and standard checks also refresh it. Run `npm run check`; the checks cover references, topic hierarchy and category membership.
