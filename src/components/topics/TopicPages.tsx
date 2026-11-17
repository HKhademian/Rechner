import "./TopicPages.css";
import {
  type Topic,
  getSubtopics,
  getTopic,
  searchTopics,
  topics,
} from "#engine/topics/registry";
import {
  getLawEntry,
} from "#engine/laws/registry";
import {
  allCalculatorApps,
} from "#/apps/registry.ts";
import {
  calculatorPath,
  sitePath,
} from "#/apps/appDefinition.ts";
import LawRefLink from "#components/laws/LawRefLink";
import {
  AppShell,
} from "#components/ui/AppShell";
import {
  useState,
} from "preact/hooks";
import type {
  JSX,
} from "preact";

export function topicPath(id?: string): string {
  return sitePath(id ? `/topics/${id}/` : "/topics/");
}

export function TopicDirectory(): JSX.Element {
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const matching = searchTopics(search);
  return <AppShell currentPath={topicPath()}>
    <div className="topic-page">
      <h1>Benefits, programs &amp; concepts</h1>
      <p>Understand the terms used in the calculators, their potential benefits and limitations, and the rules behind them.</p>
      <label className="topic-search">Search topics
        <input type="search" value={query} placeholder="Search benefits, programs and concepts" onInput={(event) => setQuery(event.currentTarget.value)} />
      </label>
      <p role="status">{matching.length} {matching.length === 1 ? "topic" : "topics"}</p>
      <div className="topic-directory">
        {matching.map((topic) => <article className="ui-card" key={topic.id}>
          <h2><a href={topicPath(topic.id)}>{topic.title}</a></h2>
          <p>{topic.description}</p>
          {search && getSubtopics(topic.id).some((child) => `${child.title} ${child.description}`.toLowerCase().includes(search)) && <ul aria-label={`Matching subtopics for ${topic.title}`}>
            {getSubtopics(topic.id).filter((child) => `${child.title} ${child.description}`.toLowerCase().includes(search)).map((child) => <li key={child.id}><a href={topicPath(child.id)}>{child.title}</a></li>)}
          </ul>}
        </article>)}
      </div>
    </div>
  </AppShell>;
}

export function TopicPage({ topic }: { readonly topic: Topic }): JSX.Element {
  const parent = topic.parentId ? getTopic(topic.parentId) : undefined;
  const children = getSubtopics(topic.id);
  const related = topics.filter((other) => !other.parentId && other.id !== topic.id && other.laws.some((law) => topic.laws.includes(law)));
  return <AppShell currentPath={topicPath(topic.id)}>
    <article className="topic-page">
      <a href={topicPath(parent?.id)}>{parent ? `← ${parent.title}` : "← All topics"}</a>
      <h1>{topic.title}</h1>
      <p>{topic.description}</p>
      {children.length > 0 && <section className="ui-card"><h2>Explore this topic</h2>
        <ul>{children.map((child) => <li key={child.id}><a href={topicPath(child.id)}>{child.title}</a></li>)}</ul>
      </section>}
      <section className="ui-card"><h2>Potential benefit</h2><p>{topic.benefit}</p></section>
      <section className="ui-card"><h2>Conditions and limitations</h2><p>{topic.limitation}</p></section>
      <section className="ui-card"><h2>In the calculators</h2><p>{topic.calculatorEffect}</p>
        <ul>{allCalculatorApps.filter((app) => topic.apps.includes(app.id)).map((app) => <li key={app.id}><a href={calculatorPath(app.id)}>{app.title}</a></li>)}</ul>
      </section>
      {(topic.laws.length > 0 || topic.source) && <section className="ui-card"><h2>Related rules and sources</h2>
        <ul>{topic.laws.map((law) => <li key={law}><LawRefLink lawId={law} label={`${getLawEntry(law).citation} · ${getLawEntry(law).title}`} /></li>)}</ul>
        {topic.source && <p><a href={topic.source.url}>{topic.source.label} ↗</a></p>}
      </section>}
      {related.length > 0 && <section className="ui-card"><h2>Related topics</h2>
        <ul>{related.map((other) => <li key={other.id}><a href={topicPath(other.id)}>{other.title}</a></li>)}</ul>
      </section>}
    </article>
  </AppShell>;
}
