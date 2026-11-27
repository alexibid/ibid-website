export const CONTACT_JOURNEY_FIXTURES = {
  endpoint: '**/api/v1/contact',
  responses: {
    success: { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) },
    serverError: { status: 500, contentType: 'application/json', body: JSON.stringify({ success: false }) }
  },
  keyboard: {
    nameBeforeSpace: 'Maria',
    nameAfterSpace: 'Siva',
    missingLetter: 'l',
    name: 'Maria Silva',
    email: 'maria@example.com',
    messageFirstLine: 'First line of text',
    messageSecondLine: 'second line of text',
    message: 'First line of text\nsecond line of text'
  },
  typed: {
    name: 'Alex Santos',
    invalidEmail: 'alex@',
    email: 'alex@example.com',
    message: 'Hello from the contact journey.'
  }
} as const;
