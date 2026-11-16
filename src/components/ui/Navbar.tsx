import type { ReactNode } from "react";
import { Button } from "./Button";
import { LogOutIcon } from "./Icons";

export interface NavbarProps {
  brandLabel?: string;
  onBrandClick?: () => void;
  studentName?: string;
  studentRegNo?: string;
  actions?: ReactNode;
  onLogout?: () => void;
}

export function Navbar({
  brandLabel = "CPE 411",
  onBrandClick,
  studentName,
  studentRegNo,
  actions,
  onLogout,
}: NavbarProps) {
  return (
    <nav className="ui-navbar no-print" aria-label="Primary navigation">
      <div className="ui-navbar-left">
        {onBrandClick ? (
          <button type="button" className="ui-navbar-brand" onClick={onBrandClick}>
            <span className="ui-navbar-dot" aria-hidden="true" />
            <span>{brandLabel}</span>
          </button>
        ) : (
          <span className="ui-navbar-brand">
            <span className="ui-navbar-dot" aria-hidden="true" />
            <span>{brandLabel}</span>
          </span>
        )}
        {actions && <div className="ui-navbar-links">{actions}</div>}
      </div>

      {(studentName || onLogout) && (
        <div className="ui-navbar-right">
          {studentName && (
            <div className="ui-navbar-user ui-hide-mobile" title={studentRegNo ? `${studentName} (${studentRegNo})` : studentName}>
              <span className="ui-navbar-user-name">{studentName}</span>
              {studentRegNo && <span className="ui-navbar-user-reg mono">{studentRegNo}</span>}
            </div>
          )}
          {onLogout && (
            <Button variant="ghost" size="sm" onClick={onLogout} aria-label="Log out">
              <LogOutIcon size={15} />
              <span>Logout</span>
            </Button>
          )}
        </div>
      )}
    </nav>
  );
}
