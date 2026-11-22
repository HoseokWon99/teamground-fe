import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sprout } from "lucide-react";
import { legalDocuments } from "./content";

function PolicyParagraph({ text }: { text: string }) {
  const email = "hs1j333@gmail.com";
  const parts = text.split(email);
  return <p>{parts.map((part, index) => <span key={index}>{index > 0 ? <a href={`mailto:${email}`}>{email}</a> : null}{part}</span>)}</p>;
}

export default function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const documentContent = legalDocuments[kind];
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${documentContent.title} | Teamground`;
    const section = document.getElementById(window.location.hash.slice(1));
    if (section) section.scrollIntoView();
    else window.scrollTo(0, 0);
    return () => { document.title = previousTitle; };
  }, [documentContent.title]);

  return (
    <div className="legal-page">
      <Link className="brand" to="/" aria-label="Teamground 홈">
        <span className="brand-mark"><Sprout size={21} /></span>
        teamground.
      </Link>
      <article className="card legal-document">
        <header className="stack">
          <p className="eyebrow">TEAMGROUND · 서비스 정책</p>
          <h1>{documentContent.title}</h1>
          <p className="muted">{documentContent.description}</p>
          <p className="legal-notice">{documentContent.notice}</p>
        </header>
        <nav aria-label="문서 목차" className="legal-toc">
          <h2>목차</h2>
          <ol>
            {documentContent.sections.map((section) => (
              <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>
            ))}
          </ol>
        </nav>
        {documentContent.sections.map((section) => (
          <section key={section.id} id={section.id} className="legal-section" aria-labelledby={`${section.id}-heading`}>
            <h2 id={`${section.id}-heading`}>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <PolicyParagraph key={paragraph} text={paragraph} />)}
            {section.id === "privacy-3" ? (
              <ul className="legal-links">
                <li><a href="https://myaccount.google.com/connections">Google 계정 연결 관리 · 접근 권한 철회</a></li>
                <li><a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a></li>
              </ul>
            ) : null}
          </section>
        ))}
      </article>
      <Link to="/" className="back-link"><ArrowLeft size={16} />서비스로 돌아가기</Link>
    </div>
  );
}
