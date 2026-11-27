"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPublicPeople, type OlympiadField, type PeopleKind, type PublicPerson } from "../lib/api";
import { EmptyState } from "./site-ui";

const fieldLabels: Record<OlympiadField, string> = {
  physics: "المپیاد فیزیک",
  computer: "المپیاد کامپیوتر",
};

export function RemotePeople({
  kind,
  field,
}: {
  kind: PeopleKind;
  field?: OlympiadField;
}) {
  const [people, setPeople] = useState<PublicPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    fetchPublicPeople(kind, field)
      .then((result) => {
        if (active) setPeople(result);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [kind, field]);

  if (loading) {
    return (
      <div className="people-grid" aria-label="در حال دریافت اطلاعات">
        {[1, 2].map((item) => <div className="person-skeleton" key={item}><span /><i /><i /><i /></div>)}
      </div>
    );
  }

  if (failed) {
    return (
      <EmptyState
        title="دریافت اطلاعات ممکن نشد"
        description="در حال حاضر دسترسی به فهرست افراد برقرار نیست. لطفاً بعداً دوباره مراجعه کنید."
        icon="!"
      />
    );
  }

  if (people.length === 0) {
    return (
      <EmptyState
        title={kind === "mentors" ? "پروفایل عمومی مشاوران هنوز منتشر نشده است" : "پروفایل عمومی مدرسان هنوز منتشر نشده است"}
        description="پس از تأیید و انتشار اطلاعات افراد، مشخصات تخصصی آن‌ها در همین بخش نمایش داده می‌شود."
      />
    );
  }

  return (
    <div className="people-grid">
      {people.map((person) => {
        const name = person.first_name + " " + person.last_name;
        const fieldLabel = fieldLabels[person.field];
        const description = person.bio || person.specialties || person.experience;
        const actionHref = kind === "mentors" ? "/mentorship/apply" : "/tutoring#request";
        const actionLabel = kind === "mentors" ? "درخواست همراهی" : "درخواست کلاس خصوصی";

        return (
          <article className="person-card" key={person.id}>
            <div className="person-avatar" aria-hidden="true">{person.first_name.slice(0, 1)}</div>
            <div className="person-content">
              <span className="person-field">{fieldLabel}</span>
              <h3>{name}</h3>
              {description ? <p>{description}</p> : <p>اطلاعات تکمیلی این پروفایل در حال آماده‌سازی است.</p>}
              {kind === "mentors" && person.achievements ? (
                <p className="person-achievement">{person.achievements}</p>
              ) : null}
              {kind === "tutors" && person.specialties ? (
                <p className="person-achievement">زمینه‌های تخصصی: {person.specialties}</p>
              ) : null}
              <Link className="person-link" href={actionHref}>{actionLabel} <span aria-hidden="true">←</span></Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
