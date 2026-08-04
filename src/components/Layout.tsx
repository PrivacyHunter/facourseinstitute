import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X, LogOut, UserRound } from "lucide-react";
import logo from "@/assets/fa-logo.png.asset.json";
import { SITE } from "@/lib/site";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/courses", label: "Courses" },
  { to: "/free", label: "Free Courses" },
  { to: "/live", label: "Live Sessions" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.16-1.35a9.9 9.9 0 0 0 4.88 1.27h.01c5.5 0 9.96-4.46 9.96-9.96A9.9 9.9 0 0 0 19.1 4.9 9.9 9.9 0 0 0 12.04 2Zm0 18.13h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.06.8.82-2.98-.2-.31a8.16 8.16 0 0 1-1.25-4.35c0-4.55 3.7-8.25 8.25-8.25 2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.84c0 4.55-3.7 8.16-8.3 8.16Zm4.52-6.11c-.25-.13-1.47-.72-1.7-.8-.22-.09-.39-.13-.55.12-.16.25-.63.8-.77.96-.14.17-.28.19-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.41.09-.17.04-.31-.02-.44-.06-.12-.55-1.34-.76-1.83-.2-.48-.4-.42-.55-.43h-.47c-.16 0-.42.06-.64.31-.22.25-.84.82-.84 2s.86 2.32.98 2.48c.12.17 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.19 1.1.16 1.52.1.46-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo.url} alt="FA Course Institute logo" className="h-10 w-auto" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  pathname === item.to && "bg-accent text-accent-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <a
              href={SITE.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="rounded-md p-2 text-success transition-colors hover:bg-accent"
              aria-label="WhatsApp Channel"
            >
              <WhatsAppIcon className="h-5 w-5" />
            </a>
            {user ? (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/profile">
                    <UserRound className="h-4 w-4" /> Profile
                  </Link>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => void signOut()}>
                  <LogOut className="h-4 w-4" /> Logout
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth">Login</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Sign up
                  </Link>
                </Button>
              </>
            )}
          </div>

          <button
            className="rounded-md p-2 text-foreground lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-border bg-background lg:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-wrap gap-2">
                {user ? (
                  <>
                    <Button asChild variant="ghost" size="sm" onClick={() => setOpen(false)}>
                      <Link to="/profile">Profile</Link>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setOpen(false);
                        void signOut();
                      }}
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="ghost" size="sm" onClick={() => setOpen(false)}>
                      <Link to="/auth">Login</Link>
                    </Button>
                    <Button asChild size="sm" onClick={() => setOpen(false)}>
                      <Link to="/auth" search={{ mode: "signup" }}>
                        Sign up
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-border bg-soft">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
          <div>
            <img src={logo.url} alt="FA Course Institute" className="h-12 w-auto" />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              {SITE.tagline}. Teaching practical, job-ready skills in Urdu since {SITE.since}.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Explore</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {NAV.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="transition-colors hover:text-primary">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Follow us</h3>
            <a
              href={SITE.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <WhatsAppIcon className="h-4 w-4 text-success" /> WhatsApp Channel
            </a>
            <p className="mt-4 text-xs text-muted-foreground">
              © {new Date().getFullYear()} {SITE.name}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export { WhatsAppIcon };
