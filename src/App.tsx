import { useI18n } from './i18n';
import { Header } from './components/Header';
import { ScrollProgress } from './components/ScrollProgress';
import { useScrollReveal } from './hooks/useScrollFx';
import { Hero } from './components/Hero';
import { About, Projects, Experience, Stack, Education, Contact, Footer } from './components/Sections';

export default function App() {
  const { t } = useI18n();
  useScrollReveal();
  return (
    <>
      <ScrollProgress />
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
