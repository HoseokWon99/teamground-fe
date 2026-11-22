import { NavLink } from "react-router-dom";

export function LegalFooter() {
  return (
    <footer className="legal-footer">
      <span>© Teamground</span>
      <nav aria-label="서비스 정책" className="row">
        <NavLink to="/privacy">개인정보처리방침</NavLink>
        <NavLink to="/terms">서비스 이용약관</NavLink>
      </nav>
    </footer>
  );
}
