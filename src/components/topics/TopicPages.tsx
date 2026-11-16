import "./TopicPages.css";
import {
  type Topic,
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
import type {
  JSX,
} from "preact";

export function topicPath(id?: string): string {
  return sitePath(id ? `/topics/${id}/` : "/topics/");
}

export function TopicDirectory(): JSX.Element {
  return <AppShell currentPath={topicPath()}>
    <div className="topic-page">
      <h1>Benefits, programs &amp; concepts</h1>
      <p>Understand the terms used in the calculators, their potential benefits and limitations, and the rules behind them.</p>
      <div className="topic-directory">
        {topics.map((topic) => <article className="ui-card" key={topic.id}>
          <h2><a href={topicPath(topic.id)}>{topic.title}</a></h2>
          <p>{topic.description}</p>
        </article>)}
      </div>
    </div>
  </AppShell>;
}

export function TopicPage({ topic }: { readonly topic: Topic }): JSX.Element {
  const related = topics.filter((other) => other.id !== topic.id && other.laws.some((law) => topic.laws.includes(law)));
  return <AppShell currentPath={topicPath(topic.id)}>
    <article className="topic-page">
      <a href={topicPath()}>← All topics</a>
      <h1>{topic.title}</h1>
      <p>{topic.description}</p>
      <section className="ui-card"><h2>Potential benefit</h2><p>{topic.benefit}</p></section>
      <section className="ui-card"><h2>Conditions and limitations</h2><p>{topic.limitation}</p></section>
      <section className="ui-card"><h2>In the calculators</h2><p>{topic.calculatorEffect}</p>
        <ul>{allCalculatorApps.filter((app) => topic.apps.includes(app.id)).map((app) => <li key={app.id}><a href={calculatorPath(app.id)}>{app.title}</a></li>)}</ul>
      </section>
      <section className="ui-card"><h2>Related laws and program sources</h2>
        <ul>{topic.laws.map((law) => <li key={law}><LawRefLink lawId={law} label={`${getLawEntry(law).citation} · ${getLawEntry(law).title}`} /></li>)}</ul>
      </section>
      {related.length > 0 && <section className="ui-card"><h2>Related topics</h2>
        <ul>{related.map((other) => <li key={other.id}><a href={topicPath(other.id)}>{other.title}</a></li>)}</ul>
      </section>}
    </article>
  </AppShell>;
}
