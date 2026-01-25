import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-container">
      <div className="footer-content">
        <p className="footer-text">
          © {currentYear} AutoInsights. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
