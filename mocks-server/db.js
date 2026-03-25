const config = require('./data/config.json');

const load = (lang, type) => require(`./data/${lang}/${type}.json`);

module.exports = () => {
  const ptHome = load('pt', 'home');
  const ptChapter = load('pt', 'chapter');
  const ptExit = load('pt', 'exit');

  const enHome = load('en', 'home');
  const enChapter = load('en', 'chapter');
  const enExit = load('en', 'exit');

  const esHome = load('es', 'home');
  const esChapter = load('es', 'chapter');
  const esExit = load('es', 'exit');

  const frHome = load('fr', 'home');
  const frChapter = load('fr', 'chapter');
  const frExit = load('fr', 'exit');

  return {
    config: config,
    // Endpoints individuais achatados para o router gerir
    "pt-home": ptHome,
    "pt-chapter": ptChapter,
    "pt-exit": ptExit,
    "en-home": enHome,
    "en-chapter": enChapter,
    "en-exit": enExit,
    "es-home": esHome,
    "es-chapter": esChapter,
    "es-exit": esExit,
    "fr-home": frHome,
    "fr-chapter": frChapter,
    "fr-exit": frExit,
    
    // Endpoints de topo para compatibilidade
    "pt": { home: ptHome, chapter: ptChapter, exit: ptExit },
    "en": { home: enHome, chapter: enChapter, exit: enExit },
    "es": { home: esHome, chapter: esChapter, exit: esExit },
    "fr": { home: frHome, chapter: frChapter, exit: frExit }
  };
};
