import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  GitFork as Github,
  Code2,
  Gift,
  ShieldCheck,
} from "lucide-react";
import styles from "./home.module.css";

function repositoryUrl() {
  const value =
    process.env.NEXT_PUBLIC_GITHUB_URL ??
    "https://github.com/kupchenko/stagemyscreen";
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.username ||
      url.password ||
      !/^\/[\w.-]+\/[\w.-]+\/?$/.test(url.pathname)
    )
      return null;
    return `https://github.com${url.pathname.replace(/\/$/, "").replace(/\.git$/, "")}`;
  } catch {
    return null;
  }
}

const points = [
  {
    Icon: Gift,
    title: "Free to use",
    text: "No account, no watermark, no limits on exports.",
  },
  {
    Icon: ShieldCheck,
    title: "Stays on your device",
    text: "Screenshots are rendered in your browser and never uploaded.",
  },
  {
    Icon: Code2,
    title: "Open source",
    text: "Read the code, report an issue, or send a pull request.",
  },
];

export function Homepage() {
  const github = repositoryUrl();
  return (
    <div className={styles.home}>
      <header className={styles.header}>
        <Link className={styles.logo} href="/" aria-label="stagemyscreen home">
          stagemyscreen<span>.</span>
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          {github ? (
            <a href={github} target="_blank" rel="noreferrer">
              <Github size={16} />
              GitHub
            </a>
          ) : null}
          <Link className={styles.navCta} href="/studio">
            Open studio
          </Link>
        </nav>
      </header>
      <main>
        <section className={styles.hero} aria-labelledby="hero-title">
          <span className={styles.badge}>Free &amp; open source</span>
          <h1 id="hero-title">
            Device mockups
            <br />
            from your screenshots.
          </h1>
          <p>
            Drop in your screens, pick a layout, and export a transparent 8K
            PNG. Right in your browser.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/studio">
              Start creating <ArrowRight size={17} />
            </Link>
            {github ? (
              <a
                className={styles.secondary}
                href={github}
                target="_blank"
                rel="noreferrer"
              >
                <Github size={17} />
                View on GitHub
              </a>
            ) : null}
          </div>
        </section>
        <div className={styles.stage}>
          <Image
            src="/home/hero-family.webp"
            alt="A studio display, phone, and tablet in the Device family layout, each showing its own dashboard screenshot"
            width={3840}
            height={2160}
            sizes="(max-width: 720px) 116vw, (max-width: 1440px) 100vw, 1440px"
            quality={90}
            preload
          />
        </div>
        <section className={styles.points} aria-label="Why stagemyscreen">
          {points.map(({ Icon, title, text }) => (
            <article key={title}>
              <Icon size={20} strokeWidth={1.6} />
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </section>
      </main>
      <footer className={styles.footer}>
        <span>
          stagemyscreen. Not affiliated with Apple or Square.
        </span>
        {github ? (
          <a href={github} target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        ) : null}
      </footer>
    </div>
  );
}
