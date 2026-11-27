import { CONTACT_I18N } from './contact-i18n';

export const UI_I18N: Record<string, unknown> = {
  pt: {
    'not-found': { title: '404 - Página não encontrada', message: 'O conteúdo que procura não existe ou foi movido.', back: 'Voltar ao início' },
    'error-network': { title: 'Erro de Ligação', message: 'Não foi possível contactar o servidor. Verifique a sua internet.' },
    'error-server': { title: 'Erro de Servidor', message: 'O nosso sistema encontrou uma dificuldade técnica. Tente mais tarde.' },
    'error-generic': { title: 'Erro Inesperado', message: 'Algo correu mal. Por favor, recarregue a página.' },
    'close': 'Fechar',
    'chapter': 'Capítulo',
    'return': 'Voltar',
    'contacts': CONTACT_I18N.pt
  },
  en: {
    'not-found': { title: '404 - Page Not Found', message: 'The content you are looking for does not exist or has been moved.', back: 'Back to home' },
    'error-network': { title: 'Connection Error', message: 'Could not contact the server. Please check your internet.' },
    'error-server': { title: 'Server Error', message: 'Our system encountered a technical difficulty. Please try again later.' },
    'error-generic': { title: 'Unexpected Error', message: 'Something went wrong. Please reload the page.' },
    'close': 'Close',
    'chapter': 'Chapter',
    'return': 'Return',
    'contacts': CONTACT_I18N.en
  },
  es: {
    'not-found': { title: '404 - Página no encontrada', message: 'El contenido que busca no existe o ha sido movido.', back: 'Volver al inicio' },
    'error-network': { title: 'Error de Conexión', message: 'No se pudo contactar con el servidor. Verifique su internet.' },
    'error-server': { title: 'Error de Servidor', message: 'Nuestro sistema encontró una dificultad técnica. Inténtelo más tarde.' },
    'error-generic': { title: 'Error Inesperado', message: 'Algo salió mal. Por favor, recargue la página.' },
    'close': 'Cerrar',
    'chapter': 'Capítulo',
    'return': 'Voltar',
    'contacts': CONTACT_I18N.es
  },
  fr: {
    'not-found': { title: '404 - Page non trouvée', message: 'Le contenu que vous recherchez n\'existe pas ou a été déplacé.', back: 'Retour à l\'accueil' },
    'error-network': { title: 'Erreur de Connexion', message: 'Impossible de contacter le serveur. Veuillez vérifier votre connexion.' },
    'error-server': { title: 'Erreur de Serveur', message: 'Notre système a rencontré une difficulté technique. Veuillez réessayer plus tard.' },
    'error-generic': { title: 'Erreur Inattendue', message: 'Une erreur s\'est produite. Veuillez recharger la page.' },
    'close': 'Fermer',
    'chapter': 'Chapitre',
    'return': 'Retour',
    'contacts': CONTACT_I18N.fr
  },
  de: {
    'not-found': {
      title: '404 - Seite nicht gefunden',
      message: 'Der gesuchte Inhalt existiert nicht oder wurde verschoben.',
      back: 'Zurück zur Startseite'
    },
    'error-network': {
      title: 'Verbindungsfehler',
      message: 'Der Server konnte nicht erreicht werden. Bitte überprüfen Sie Ihre Internetverbindung.'
    },
    'error-server': {
      title: 'Serverfehler',
      message: 'Unser System hat ein technisches Problem festgestellt. Bitte versuchen Sie es später erneut.'
    },
    'error-generic': {
      title: 'Unerwarteter Fehler',
      message: 'Etwas ist schiefgelaufen. Bitte laden Sie die Seite neu.'
    },
    'close': 'Schließen',
    'chapter': 'Kapitel',
    'return': 'Zurück',
    'contacts': CONTACT_I18N.de
  }
};
