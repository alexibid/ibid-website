import type { SupportedLanguage } from './languages';
import type {
  ContactFieldErrorCode,
  ContactFieldName,
  ContactSubmissionErrorCode
} from '../models/contact.model';
import { CONTACT_CONSTRAINTS } from '../validators/contact-form.validator';

export interface ContactFieldLengthErrors {
  readonly required: string;
  readonly tooShort: string;
  readonly tooLong: string;
}

export interface ContactEmailFieldErrors extends ContactFieldLengthErrors {
  readonly invalid: string;
}

export interface ContactErrorTranslations {
  readonly name: ContactFieldLengthErrors;
  readonly email: ContactEmailFieldErrors;
  readonly message: ContactFieldLengthErrors;
}

export interface ContactTranslations {
  readonly socials: string;
  readonly maps: string;
  readonly name: string;
  readonly 'name-placeholder': string;
  readonly email: string;
  readonly 'email-placeholder': string;
  readonly message: string;
  readonly 'message-placeholder': string;
  readonly submit: string;
  readonly 'info-title': string;
  readonly loading: string;
  readonly submitting: string;
  readonly 'success-title': string;
  readonly 'success-message': string;
  readonly 'send-another': string;
  readonly retry: string;
  readonly 'privacy-notice': string;
  readonly errors: ContactErrorTranslations;
  readonly 'submission-errors': Readonly<Record<ContactSubmissionErrorCode, string>>;
}

export const CONTACT_FIELD_ERROR_KEYS = {
  name: {
    required: 'contacts.errors.name.required',
    tooShort: 'contacts.errors.name.tooShort',
    tooLong: 'contacts.errors.name.tooLong'
  },
  email: {
    required: 'contacts.errors.email.required',
    tooShort: 'contacts.errors.email.tooShort',
    invalid: 'contacts.errors.email.invalid',
    tooLong: 'contacts.errors.email.tooLong'
  },
  message: {
    required: 'contacts.errors.message.required',
    tooShort: 'contacts.errors.message.tooShort',
    tooLong: 'contacts.errors.message.tooLong'
  }
} as const satisfies Readonly<
  Record<ContactFieldName, Readonly<Partial<Record<ContactFieldErrorCode, string>>>>
>;

export const CONTACT_SUBMISSION_ERROR_KEYS = {
  offline: 'contacts.submission-errors.offline',
  network: 'contacts.submission-errors.network',
  timeout: 'contacts.submission-errors.timeout',
  validation: 'contacts.submission-errors.validation',
  verification: 'contacts.submission-errors.verification',
  rateLimit: 'contacts.submission-errors.rateLimit',
  server: 'contacts.submission-errors.server',
  unknown: 'contacts.submission-errors.unknown'
} as const satisfies Readonly<Record<ContactSubmissionErrorCode, string>>;

const LIMITS = CONTACT_CONSTRAINTS;

export const CONTACT_I18N: Record<SupportedLanguage, ContactTranslations> = {
  pt: {
    socials: 'Redes Sociais',
    maps: 'Ver no Google Maps',
    name: 'Nome',
    'name-placeholder': 'O seu nome',
    email: 'E-mail',
    'email-placeholder': 'O seu e-mail',
    message: 'Mensagem',
    'message-placeholder': 'Como o podemos ajudar?',
    submit: 'Enviar Mensagem',
    'info-title': 'Informações',
    loading: 'A preparar a contracapa e o formulário…',
    submitting: 'A enviar…',
    'success-title': 'Mensagem enviada',
    'success-message': 'Obrigado pelo seu contacto. Responderemos em breve.',
    'send-another': 'Enviar outra mensagem',
    retry: 'Por favor, tente novamente.',
    'privacy-notice': 'Os seus dados são utilizados apenas para responder à sua mensagem e não são partilhados com terceiros. Protegido contra spam pelo reCAPTCHA.',
    errors: {
      name: { required: 'O nome é obrigatório.', tooShort: `Mínimo de ${LIMITS.name.min} caracteres.`, tooLong: `Máximo de ${LIMITS.name.max} caracteres.` },
      email: { required: 'O e-mail é obrigatório.', tooShort: `Mínimo de ${LIMITS.email.min} caracteres.`, invalid: 'Introduza um e-mail válido.', tooLong: `Máximo de ${LIMITS.email.max} caracteres.` },
      message: { required: 'A mensagem é obrigatória.', tooShort: `Mínimo de ${LIMITS.message.min} caracteres.`, tooLong: `Máximo de ${LIMITS.message.max} caracteres.` }
    },
    'submission-errors': {
      offline: 'Está sem ligação à internet. Verifique a sua ligação.',
      network: 'Não foi possível enviar a mensagem devido a um erro de ligação.',
      timeout: 'O envio demorou demasiado tempo e expirou.',
      validation: 'Alguns campos contêm valores inválidos. Reveja o formulário.',
      verification: 'A verificação de segurança foi bloqueada ou falhou. Verifique os bloqueadores de conteúdo ou recarregue a página e tente novamente.',
      rateLimit: 'Demasiadas tentativas seguidas. Aguarde alguns instantes.',
      server: 'O servidor não conseguiu processar a sua mensagem.',
      unknown: 'Ocorreu um erro inesperado ao enviar a mensagem.'
    }
  },
  en: {
    socials: 'Social Networks',
    maps: 'View on Google Maps',
    name: 'Name',
    'name-placeholder': 'Your name',
    email: 'Email',
    'email-placeholder': 'Your email',
    message: 'Message',
    'message-placeholder': 'How can we help you?',
    submit: 'Send Message',
    'info-title': 'Information',
    loading: 'Preparing the back cover and contact form…',
    submitting: 'Sending…',
    'success-title': 'Message sent',
    'success-message': 'Thank you for reaching out. We will reply shortly.',
    'send-another': 'Send another message',
    retry: 'Please try again.',
    'privacy-notice': 'Your details are used solely to reply to your message and are not shared with third parties. Protected against spam by reCAPTCHA.',
    errors: {
      name: { required: 'Name is required.', tooShort: `At least ${LIMITS.name.min} characters.`, tooLong: `Maximum ${LIMITS.name.max} characters.` },
      email: { required: 'Email is required.', tooShort: `At least ${LIMITS.email.min} characters.`, invalid: 'Enter a valid email address.', tooLong: `Maximum ${LIMITS.email.max} characters.` },
      message: { required: 'Message is required.', tooShort: `At least ${LIMITS.message.min} characters.`, tooLong: `Maximum ${LIMITS.message.max} characters.` }
    },
    'submission-errors': {
      offline: 'You appear to be offline. Please check your internet connection.',
      network: 'Could not send the message due to a network error.',
      timeout: 'The request timed out before the message could be sent.',
      validation: 'Some fields contain invalid values. Please review the form.',
      verification: 'Security verification failed or was blocked. Check your content blockers or reload the page and try again.',
      rateLimit: 'Too many attempts in a row. Please wait a moment.',
      server: 'The server could not process your message.',
      unknown: 'An unexpected error occurred while sending your message.'
    }
  },
  es: {
    socials: 'Redes Sociales',
    maps: 'Ver en Google Maps',
    name: 'Nombre',
    'name-placeholder': 'Su nombre',
    email: 'Correo electrónico',
    'email-placeholder': 'Su correo',
    message: 'Mensaje',
    'message-placeholder': '¿Cómo le podemos ayudar?',
    submit: 'Enviar mensaje',
    'info-title': 'Información',
    loading: 'Preparando la contraportada y el formulario…',
    submitting: 'Enviando…',
    'success-title': 'Mensaje enviado',
    'success-message': 'Gracias por ponerse en contacto. Le responderemos pronto.',
    'send-another': 'Enviar otro mensaje',
    retry: 'Por favor, inténtelo de nuevo.',
    'privacy-notice': 'Sus datos se utilizan únicamente para responder a su mensaje y no se comparten con terceros. Protegido contra el spam mediante reCAPTCHA.',
    errors: {
      name: { required: 'El nombre es obligatorio.', tooShort: `Mínimo ${LIMITS.name.min} caracteres.`, tooLong: `Máximo ${LIMITS.name.max} caracteres.` },
      email: { required: 'El correo es obligatorio.', tooShort: `Mínimo ${LIMITS.email.min} caracteres.`, invalid: 'Introduzca un correo válido.', tooLong: `Máximo ${LIMITS.email.max} caracteres.` },
      message: { required: 'El mensaje es obligatorio.', tooShort: `Mínimo ${LIMITS.message.min} caracteres.`, tooLong: `Máximo ${LIMITS.message.max} caracteres.` }
    },
    'submission-errors': {
      offline: 'Parece estar sin conexión. Compruebe su conexión a internet.',
      network: 'No se pudo enviar el mensaje por un error de red.',
      timeout: 'La solicitud tardó demasiado y agotó el tiempo de espera.',
      validation: 'Algunos campos contienen valores no válidos. Revise el formulario.',
      verification: 'La verificación de seguridad falló o fue bloqueada. Revise los bloqueadores de contenido o recargue la página e inténtelo de nuevo.',
      rateLimit: 'Demasiados intentos seguidos. Espere unos instantes.',
      server: 'El servidor no pudo procesar su mensaje.',
      unknown: 'Se produjo un error inesperado al enviar su mensaje.'
    }
  },
  fr: {
    socials: 'Réseaux Sociaux',
    maps: 'Voir sur Google Maps',
    name: 'Nom',
    'name-placeholder': 'Votre nom',
    email: 'E-mail',
    'email-placeholder': 'Votre e-mail',
    message: 'Message',
    'message-placeholder': 'Comment pouvons-nous vous aider ?',
    submit: 'Envoyer le message',
    'info-title': 'Informations',
    loading: 'Préparation de la quatrième de couverture et du formulaire…',
    submitting: 'Envoi en cours…',
    'success-title': 'Message envoyé',
    'success-message': 'Merci pour votre message. Nous vous répondrons bientôt.',
    'send-another': 'Envoyer un autre message',
    retry: 'Veuillez réessayer.',
    'privacy-notice': 'Vos données servent uniquement à répondre à votre message et ne sont pas partagées avec des tiers. Protégé contre le spam par reCAPTCHA.',
    errors: {
      name: { required: 'Le nom est requis.', tooShort: `Au moins ${LIMITS.name.min} caractères.`, tooLong: `Maximum ${LIMITS.name.max} caractères.` },
      email: { required: 'L’e-mail est requis.', tooShort: `Au moins ${LIMITS.email.min} caractères.`, invalid: 'Saisissez un e-mail valide.', tooLong: `Maximum ${LIMITS.email.max} caractères.` },
      message: { required: 'Le message est requis.', tooShort: `Au moins ${LIMITS.message.min} caractères.`, tooLong: `Maximum ${LIMITS.message.max} caractères.` }
    },
    'submission-errors': {
      offline: 'Vous semblez être hors ligne. Veuillez vérifier votre connexion internet.',
      network: 'Impossible d’envoyer le message en raison d’une erreur réseau.',
      timeout: 'La requête a expiré avant que le message puisse être envoyé.',
      validation: 'Certains champs contiennent des valeurs invalides. Veuillez vérifier le formulaire.',
      verification: 'La vérification de sécurité a échoué ou a été bloquée. Vérifiez vos bloqueurs de contenu ou rechargez la page et réessayez.',
      rateLimit: 'Trop de tentatives successives. Veuillez patienter un instant.',
      server: 'Le serveur n’a pas pu traiter votre message.',
      unknown: 'Une erreur inattendue s’est produite lors de l’envoi de votre message.'
    }
  },
  de: {
    socials: 'Soziale Netzwerke',
    maps: 'Auf Google Maps ansehen',
    name: 'Name',
    'name-placeholder': 'Ihr Name',
    email: 'E-Mail',
    'email-placeholder': 'Ihre E-Mail-Adresse',
    message: 'Nachricht',
    'message-placeholder': 'Wie können wir Ihnen helfen?',
    submit: 'Nachricht senden',
    'info-title': 'Informationen',
    loading: 'Rückseite und Kontaktformular werden vorbereitet…',
    submitting: 'Wird gesendet…',
    'success-title': 'Nachricht gesendet',
    'success-message': 'Vielen Dank für Ihre Nachricht. Wir melden uns in Kürze.',
    'send-another': 'Weitere Nachricht senden',
    retry: 'Bitte versuchen Sie es erneut.',
    'privacy-notice': 'Ihre Daten werden ausschließlich zur Beantwortung Ihrer Nachricht verwendet und nicht an Dritte weitergegeben. Durch reCAPTCHA vor Spam geschützt.',
    errors: {
      name: { required: 'Der Name ist erforderlich.', tooShort: `Mindestens ${LIMITS.name.min} Zeichen.`, tooLong: `Höchstens ${LIMITS.name.max} Zeichen.` },
      email: { required: 'Die E-Mail ist erforderlich.', tooShort: `Mindestens ${LIMITS.email.min} Zeichen.`, invalid: 'Bitte gültige E-Mail eingeben.', tooLong: `Höchstens ${LIMITS.email.max} Zeichen.` },
      message: { required: 'Die Nachricht ist erforderlich.', tooShort: `Mindestens ${LIMITS.message.min} Zeichen.`, tooLong: `Höchstens ${LIMITS.message.max} Zeichen.` }
    },
    'submission-errors': {
      offline: 'Sie scheinen offline zu sein. Bitte überprüfen Sie Ihre Internetverbindung.',
      network: 'Die Nachricht konnte aufgrund eines Netzwerkfehlers nicht gesendet werden.',
      timeout: 'Die Anfrage hat das Zeitlimit überschritten.',
      validation: 'Einige Felder enthalten ungültige Werte. Bitte überprüfen Sie das Formular.',
      verification: 'Die Sicherheitsüberprüfung ist fehlgeschlagen oder wurde blockiert. Prüfen Sie Ihre Inhaltsblocker oder laden Sie die Seite neu und versuchen Sie es erneut.',
      rateLimit: 'Zu viele Versuche hintereinander. Bitte warten Sie einen Moment.',
      server: 'Der Server konnte Ihre Nachricht nicht verarbeiten.',
      unknown: 'Beim Senden Ihrer Nachricht ist ein unerwarteter Fehler aufgetreten.'
    }
  }
};
