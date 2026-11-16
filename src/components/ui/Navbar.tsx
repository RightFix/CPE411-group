import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChipLogoIcon, LogOutIcon } from "./Icons";

export interface NavbarProps {
  brandLabel?: string;
  onBrandClick?: () => void;
  studentName?: string;
  studentRegNo?: string;
  actions?: ReactNode;
  onLogout?: () => void;
}

function getInitials(fullName: string): string {
  const cleaned = fullName.trim();
  if (!cleaned) return "?";
  // Handle "LASTNAME, FIRSTNAME MIDDLENAME" format
  if (cleaned.includes(",")) {
    const [lastPart, restPart] = cleaned.split(",").map((s) => s.trim());
    const firstWord = restPart?.split(/\s+/)[0] ?? "";
    const lastWord = lastPart?.split(/\s+/)[0] ?? "";
    const firstChar = firstWord[0] ?? "";
    const lastChar = lastWord[0] ?? "";
    return (firstChar + lastChar).toUpperCase() || cleaned[0].toUpperCase();
  }
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Navbar({
  brandLabel = "CPE 411",
  onBrandClick,
  studentName,
  studentRegNo,
  actions,
  onLogout,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const initials = studentName ? getInitials(studentName) : "";

  return (
    <nav className="ui-navbar no-print" aria-label="Primary navigation">
      <div className="ui-navbar-left">
        {onBrandClick ? (
          <button type="button" className="ui-navbar-brand" onClick={onBrandClick}>
            <ChipLogoIcon size={22} />
            <span>{brandLabel}</span>
          </button>
        ) : (
          <span className="ui-navbar-brand">
            <ChipLogoIcon size={22} />
            <span>{brandLabel}</span>
          </span>
        )}
        {actions && <div className="ui-navbar-links">{actions}</div>}
      </div>

      {studentName && (
        <div className="ui-navbar-right" ref={menuWrapRef}>
          <button
            ref={triggerRef}
            type="button"
            className={`ui-avatar-btn ${menuOpen ? "is-open" : ""}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Account menu for ${studentName}`}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span>{initials}</span>
          </button>

          {menuOpen && (
            <div className="ui-avatar-menu" role="menu">
              <div className="ui-avatar-menu-info">
                <p className="ui-avatar-menu-name">{studentName}</p>
                {studentRegNo && (
                  <p className="ui-avatar-menu-reg mono">{studentRegNo}</p>
                )}
              </div>
              {onLogout && (
                <>
                  <div className="ui-avatar-menu-divider" role="separator" />
                  <button
                    type="button"
                    role="menuitem"
                    className="ui-avatar-menu-logout"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                  >
                    <LogOutIcon size={15} />
                    <span>Logout</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
