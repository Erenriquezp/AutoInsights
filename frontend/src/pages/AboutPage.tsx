import { Icon } from '../components/Icon';
import { useI18n } from '../i18n/context';
import './pages.css';

const REPO = 'https://github.com/Erenriquezp/AutoInsights';

export default function AboutPage() {
  const { t } = useI18n();
  const links = [
    { href: 'https://www.kaggle.com/datasets/austinreese/craigslist-carstrucks-data', label: t.about.dataset },
    { href: REPO, label: t.about.code },
    { href: `${REPO}/tree/main/docs`, label: t.about.docs },
    { href: 'https://erenriquezp-portfolio.vercel.app', label: t.about.portfolio },
  ];
  return (
    <article className="panel about">
      <h2 className="about-title">{t.about.title}</h2>
      <p className="about-lead">{t.about.body}</p>

      <h3>{t.about.pipelineTitle}</h3>
      <ol className="about-steps">
        {t.about.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <h3>{t.about.askTitle}</h3>
      <p>{t.about.askBody}</p>

      <h3>{t.about.sourceTitle}</h3>
      <p>{t.about.source}</p>
      <ul className="about-links">
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} target="_blank" rel="noreferrer">
              {link.label}
              <Icon name="external" size={16} />
            </a>
          </li>
        ))}
      </ul>
      <p className="about-author">{t.about.author}</p>
    </article>
  );
}
