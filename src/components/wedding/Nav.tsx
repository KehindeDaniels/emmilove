import { useEffect, useState } from "react";

const NAV = [
  { id: "story", label: "Our Story" },
  { id: "proposal", label: "The Proposal" },
  { id: "details", label: "Details" },
  { id: "rsvp", label: "RSVP" },
  { id: "gallery", label: "Gallery" },
  { id: "gift", label: "Gift" },
];

const Nav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        scrolled ? "py-3 glass shadow-soft" : "py-5 bg-transparent"
      }`}
    >
      <div className="container flex items-center justify-between">
        <a href="#top" className="flex items-baseline gap-2">
          <span className="font-script text-2xl md:text-3xl text-gradient-gold">Emma</span>
          <span className={`font-serif-display text-sm tracking-[0.3em] ${scrolled ? "text-foreground" : "text-white"}`}>&</span>
          <span className="font-script text-2xl md:text-3xl text-gradient-gold">Funmi</span>
        </a>
        <nav className="hidden md:flex items-center gap-8">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={`text-xs uppercase tracking-[0.2em] transition-colors hover:text-gold ${
                scrolled ? "text-foreground/80" : "text-white/90"
              }`}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <button
          onClick={() => setOpen(!open)}
          className={`md:hidden p-2 ${scrolled ? "text-foreground" : "text-white"}`}
          aria-label="Menu"
        >
          <div className="w-6 h-px bg-current mb-1.5" />
          <div className="w-6 h-px bg-current mb-1.5" />
          <div className="w-4 h-px bg-current ml-auto" />
        </button>
      </div>
      {open && (
        <div className="md:hidden glass mt-3 mx-4 rounded-2xl p-6 animate-fade-up">
          <nav className="flex flex-col gap-4">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                onClick={() => setOpen(false)}
                className="text-sm uppercase tracking-[0.2em] text-foreground/80 hover:text-gold"
              >
                {n.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Nav;
