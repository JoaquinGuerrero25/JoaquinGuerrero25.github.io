import { useI18n } from './i18n';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { About, Projects, Experience, Stack, Education, Contact, Footer } from './components/Sections';

export default function App() {
  const { t } = useI18n();
  return (
    <>
      <a className="skip" href="#contenido" data-i18n="">{t('skip')}</a>
      <Header />
      <main id="contenido">
        <Hero />
        <About />
        <Projects />
        <Experience />
        <Stack />
        <Education />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
