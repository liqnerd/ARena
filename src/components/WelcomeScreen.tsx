import { useEffect, useState } from 'react';

interface Props {
  onEnter: () => void;
}

export function WelcomeScreen({ onEnter }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="fixed inset-0 z-50 select-none overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-black/30 to-black/75" />

      <div
        className="absolute inset-y-0 left-[62%] right-0 flex flex-col justify-center px-14"
        style={{
          opacity: ready ? 1 : 0,
          transform: ready ? 'translateX(0)' : 'translateX(20px)',
          transition: 'opacity 0.7s ease-out, transform 0.7s ease-out',
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}arena.svg`}
          alt="ARena"
          draggable={false}
          className="mb-12 h-10 w-auto object-contain object-left"
          style={{ filter: 'brightness(0) invert(1)' }}
        />

        <p
          className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white/40"
        >
          360° Spatial Editor
        </p>

        <h1
          className="mb-5 text-[42px] font-semibold leading-[1.15] text-white"
          style={{ letterSpacing: '-0.03em' }}
        >
          Tvořte prostory,<br />
          které ohromí.
        </h1>

        <p
          className="mb-10 text-[15px] font-light leading-[1.7] text-white/60"
          style={{ letterSpacing: '-0.01em' }}
        >
          Profesionální editor pro návrh a prezentaci<br />
          imerzivních 360° scén.
        </p>

        <div>
          <button
            type="button"
            onClick={onEnter}
            className="group inline-flex items-center gap-2.5 rounded-full px-8 py-3.5 text-[14px] font-medium !text-white transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            Vstoupit
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <p className="mt-12 text-[11px] uppercase tracking-widest text-white/25">
          © 2026 ARena Studio
        </p>
      </div>
    </div>
  );
}
