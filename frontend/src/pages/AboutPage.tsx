import { Icon } from '../components/Icon';
import { Card, KpiStrip } from '../components/ui';
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
    <div className="about">
      {/* what this is, and its three numbers, side by side */}
      <Card className="about-intro" title={t.about.title}>
        <div className="about-intro-body">
          <p className="about-lead">{t.about.body}</p>
          <KpiStrip nested lead={false} columns={3} label={t.about.factsLabel} items={t.about.facts.map(([value, label]) => ({ label, value }))} />
        </div>
      </Card>

      {/* the pipeline is a sequence, so its steps are numbered and each hands over to the next */}
      <Card title={t.about.pipelineTitle}>
        <ol className="pipeline">
          {t.about.steps.map((step, i) => (
            <li key={step}>
              <span className="pipeline-step" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{t.about.stepTitles[i]}</h3>
              <p className="pipeline-figure">{t.about.stepFigures[i]}</p>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </Card>

      <div className="about-pair">
        <Card title={t.about.askTitle}>
          <ol className="ask-flow">
            {t.about.askFlow.map((stage) => (
              <li key={stage}>{stage}</li>
            ))}
          </ol>
          <p>{t.about.askBody}</p>
        </Card>
        <Card title={t.about.sourceTitle}>
          <p>{t.about.source}</p>
          <ul className="about-links">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noreferrer">
                  <span>{link.label}</span>
                  <Icon name="external" size={16} />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <p className="about-author">{t.about.author}</p>
    </div>
  );
}
