import {
  type JSX,
} from "preact";
import {
  useEffect,
  useState,
} from "preact/hooks";
import {
  type LifePerson,
  type PersonId,
  PersonRelationship,
  completedYearsOn,
  toLifeDate,
  toPersonId,
  toPersonRelationship,
  upcomingBirthdays,
} from "#engine/lifeProfile/person";
import {
  PeopleRecordStatus,
} from "#engine/lifeProfile/peopleRecord";
import {
  readPeople,
  writePeople,
} from "#engine/lifeProfile/peopleStorage";
import "./LifePeople.css";

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatRelationship(relationship: PersonRelationship | undefined): string {
  if (relationship === PersonRelationship.Self) {
    return "Self";
  }
  if (relationship === PersonRelationship.Partner) {
    return "Partner";
  }
  if (relationship === PersonRelationship.Child) {
    return "Child";
  }
  if (relationship === PersonRelationship.Other) {
    return "Other household member";
  }
  return "";
}

export default function LifePeople({ onChange }: { readonly onChange?: () => void }): JSX.Element {
  const [people, setPeople] = useState<readonly LifePerson[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [relationship, setRelationship] = useState("");
  const [asOf, setAsOf] = useState("");
  const [editing, setEditing] = useState<PersonId | undefined>();

  useEffect(() => {
    const decoded = readPeople();
    if (decoded.status === PeopleRecordStatus.Valid) {
      setPeople(decoded.record?.people ?? []);
    }
    else if (decoded.status !== PeopleRecordStatus.Missing) {
      setError("People data could not be read. Export your data before making changes.");
      return;
    }
    setAsOf(today());
    setReady(true);
  }, []);

  function unchanged(): boolean {
    const current = readPeople();
    if (current.status === PeopleRecordStatus.Missing) {
      return people.length === 0;
    }
    return current.status === PeopleRecordStatus.Valid
      && JSON.stringify(current.record?.people) === JSON.stringify(people);
  }

  function save(event: JSX.TargetedEvent<HTMLFormElement, Event>): void {
    event.preventDefault();
    try {
      if (!unchanged()) {
        setError("People data changed elsewhere. Reload this page before editing.");
        return;
      }
      const person: LifePerson = {
        id: editing ?? toPersonId(crypto.randomUUID()),
        name: name.trim(),
        ...(birthDate ? { birthDate: toLifeDate(birthDate) } : {}),
        ...(relationship ? { relationship: toPersonRelationship(relationship) } : {}),
      };
      if (!person.name) {
        setError("Enter a name.");
        return;
      }
      const next = editing ? people.map((entry) => entry.id === editing ? person : entry) : [...people, person];
      if (!writePeople({
        version: 1,
        people: next,
      })) {
        setError("Could not save people. Check your storage or export existing data.");
        return;
      }
      setPeople(next);
      onChange?.();
      setName("");
      setBirthDate("");
      setRelationship("");
      setEditing(undefined);
      setError("");
    }
    catch {
      setError("Enter a valid birthdate and relationship.");
    }
  }

  function remove(id: PersonId): void {
    if (!unchanged()) {
      setError("People data changed elsewhere. Reload this page before editing.");
      return;
    }
    const next = people.filter((person) => person.id !== id);
    if (!writePeople({
      version: 1,
      people: next,
    })) {
      setError("Could not remove this person. Remove their timeline events and saved event projections first, and check your storage.");
      return;
    }
    setPeople(next);
    onChange?.();
    if (editing === id) {
      setEditing(undefined);
      setName("");
      setBirthDate("");
      setRelationship("");
    }
    setError("");
  }

  let upcoming: ReturnType<typeof upcomingBirthdays> = [];
  if (asOf && people.length > 0) {
    try {
      upcoming = upcomingBirthdays(people, toLifeDate(asOf), 90);
    }
    catch {
      upcoming = [];
    }
  }

  return <section className="ui-card life-people" aria-labelledby="life-people-heading">
    <h2 id="life-people-heading">People</h2>
    <p>Add people and household relationships to your life profile. Calculator inputs are still managed separately.</p>
    {error && <p role="alert">{error}</p>}
    {ready && <>
      <label className="life-people__field">Age on
        <input type="date" value={asOf} onInput={(event) => setAsOf(event.currentTarget.value)} />
      </label>
      {people.length === 0 ? <p>No people added yet.</p> : <ul className="life-people__list">
        {people.map((person) => {
          let age: number | undefined;
          try {
            age = asOf ? completedYearsOn(person.birthDate, toLifeDate(asOf)) : undefined;
          }
          catch {
            age = undefined;
          }
          const roleLabel = formatRelationship(person.relationship);
          return <li key={person.id}>
            <div><strong>{person.name}{roleLabel ? ` (${roleLabel})` : ""}</strong><p>{person.birthDate ? `Born ${person.birthDate}` : "Birthdate not provided"}{age === undefined ? "" : ` · ${age} years old`}</p></div>
            <div className="life-people__actions">
              <button className="ui-btn ui-btn--sm" type="button" aria-label={`Edit ${person.name}`} onClick={() => {
                setEditing(person.id);
                setName(person.name);
                setBirthDate(person.birthDate ?? "");
                setRelationship(person.relationship ?? "");
              }}>Edit</button>
              <button className="ui-btn ui-btn--sm" type="button" aria-label={`Remove ${person.name}`} onClick={() => remove(person.id)}>Remove</button>
            </div>
          </li>;
        })}
      </ul>}
      {upcoming.length > 0 && <details className="calc-explain">
        <summary>Upcoming birthdays within 90 days ({upcoming.length})</summary>
        <ul className="calc-explain__list">
          {upcoming.map((entry) => <li key={entry.personId}>
            <strong>{entry.name}</strong>: {entry.nextBirthday} (turning {entry.turningAge}, {entry.daysUntil === 0 ? "today" : `in ${entry.daysUntil} days`})
          </li>)}
        </ul>
      </details>}
      <form className="life-people__form" onSubmit={save}>
        <label className="life-people__field">Name
          <input required value={name} onInput={(event) => setName(event.currentTarget.value)} />
        </label>
        <label className="life-people__field">Relationship <span>(optional)</span>
          <select value={relationship} onChange={(event) => setRelationship(event.currentTarget.value)}>
            <option value="">Not specified</option>
            <option value={PersonRelationship.Self}>Self</option>
            <option value={PersonRelationship.Partner}>Partner</option>
            <option value={PersonRelationship.Child}>Child</option>
            <option value={PersonRelationship.Other}>Other household member</option>
          </select>
        </label>
        <label className="life-people__field">Birthdate <span>(optional)</span>
          <input type="date" value={birthDate} onInput={(event) => setBirthDate(event.currentTarget.value)} />
        </label>
        <button className="ui-btn ui-btn--primary" type="submit">{editing ? "Save changes" : "Add person"}</button>
        {editing && <button className="ui-btn" type="button" onClick={() => {
          setEditing(undefined);
          setName("");
          setBirthDate("");
          setRelationship("");
        }}>Cancel</button>}
      </form>
    </>}
  </section>;
}
