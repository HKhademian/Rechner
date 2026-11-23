import "./TopicPages.css";
import {
  type Topic,
  getSubtopics,
  getTopic,
  searchTopics,
} from "#engine/topics/registry";
import {
  getRelatedTopics,
} from "#engine/topics/navigation";
import {
  topicPath,
} from "#utils/topicPath";
import {
  topicCategories,
} from "#engine/topics/categories";
import {
  getLawEntry,
} from "#engine/laws/registry";
import {
  allCalculatorApps,
} from "#/apps/registry.ts";
import {
  calculatorPath,
} from "#/apps/appDefinition.ts";
import LawRefLink from "#components/laws/LawRefLink";
import {
  InlineContent,
} from "#components/topics/InlineContent";
import {
  plainContentText,
} from "#utils/contentLinks";
import {
  useState,
} from "preact/hooks";
import type {
  JSX,
} from "preact";

export function TopicDirectory(): JSX.Element {
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const matching = searchTopics(search);
  return <div className="topic-page">
    <h1>Topics and explanations</h1>
    <p>Browse practical guides to the terms, benefits, programs and rules used in the calculators.</p>
    <label className="topic-search">Search topics
      <input type="search" value={query} placeholder="Search benefits, programs and concepts" onInput={(event) => setQuery(event.currentTarget.value)} />
    </label>
    <p role="status">{matching.length} {matching.length === 1 ? "topic" : "topics"}{search ? " found" : ""}</p>
    {!search && <nav aria-label="Topic categories" className="topic-category-links">
      {topicCategories.map((category) => <a href={`#${category.id}`} key={category.id}>{category.title}</a>)}
    </nav>}
    {topicCategories.map((category) => {
      const categoryTopics = category.topicIds.flatMap((id) => matching.filter((topic) => topic.id === id));
      if (categoryTopics.length === 0) {
        return null;
      }
      return <section id={category.id} className="topic-category" key={category.id}>
        <div><h2>{category.title}</h2><p>{category.description}</p></div>
        <div className="topic-directory">
          {categoryTopics.map((topic) => <article className="ui-card" key={topic.id}>
            <h3><a href={topicPath(topic.id)}>{topic.title}</a></h3>
            <p><InlineContent text={topic.description} /></p>
            {!search && getSubtopics(topic.id).length > 0 && <p className="topic-subtopic-count">{getSubtopics(topic.id).length} {getSubtopics(topic.id).length === 1 ? "subtopic" : "subtopics"}</p>}
            {search && getSubtopics(topic.id).some((child) => plainContentText(`${child.title} ${child.description}`).toLowerCase().includes(search)) && <ul aria-label={`Matching subtopics for ${topic.title}`}>
              {getSubtopics(topic.id).filter((child) => plainContentText(`${child.title} ${child.description}`).toLowerCase().includes(search)).map((child) => <li key={child.id}><a href={topicPath(child.id)}>{child.title}</a></li>)}
            </ul>}
          </article>)}
        </div>
      </section>;
    })}
    {matching.length === 0 && <p>No topics found. Try another search term.</p>}
  </div>;
}

export function TopicPage({ topic }: { readonly topic: Topic }): JSX.Element {
  const parent = topic.parentId ? getTopic(topic.parentId) : undefined;
  const overview = parent ?? topic;
  const category = topicCategories.find((item) => item.topicIds.some((id) => id === overview.id));
  const siblings = getSubtopics(overview.id);
  const children = getSubtopics(topic.id);
  const related = getRelatedTopics(topic);
  return <div className="topic-layout">
    <nav aria-label="Topic navigation" className="topic-navigation">
      <a href={category ? `${topicPath()}#${category.id}` : topicPath()}>← {category?.title ?? "All topics"}</a>
      <a href={topicPath(overview.id)} aria-current={topic.id === overview.id ? "page" : undefined}>{overview.title}</a>
      {siblings.length > 0 && <ul>{siblings.map((sibling) => <li key={sibling.id}><a href={topicPath(sibling.id)} aria-current={topic.id === sibling.id ? "page" : undefined}>{sibling.title}</a></li>)}</ul>}
    </nav>
    <article className="topic-page">
      <a href={topicPath(parent?.id)}>{parent ? `← ${parent.title}` : "← All topics"}</a>
      <h1>{topic.title}</h1>
      <p><InlineContent text={topic.description} /></p>
      {children.length > 0 && <section className="ui-card"><h2>Subtopics</h2>
        <ul>{children.map((child) => <li key={child.id}><a href={topicPath(child.id)}>{child.title}</a></li>)}</ul>
      </section>}
      <section className="ui-card"><h2>Potential benefit</h2><p><InlineContent text={topic.benefit} /></p></section>
      <section className="ui-card"><h2>Conditions and limitations</h2><p><InlineContent text={topic.limitation} /></p></section>
      <section className="ui-card"><h2>In the calculators</h2><p><InlineContent text={topic.calculatorEffect} /></p>
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
  </div>;
}
