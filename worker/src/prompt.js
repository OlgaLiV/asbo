// Builds ASBO's instructions: approved knowledge + the live price table + the reply format.
import { priceTable } from './prices.js';

export const ACTIONS = ['none', 'work', 'services', 'about', 'book'];

// Structured reply: the text the visitor sees, an optional button, the reply language,
// and the prices the reply mentions (checked against the table by validate.js).
export function replySchema(priceKeys) {
  return {
    type: 'object',
    properties: {
      reply: { type: 'string' },
      action: { type: 'string', enum: ACTIONS },
      lang: { type: 'string', enum: ['en', 'ru', 'uk'] },
      prices_mentioned: {
        type: 'array',
        items: {
          type: 'object',
          properties: { service: { type: 'string', enum: priceKeys }, amount: { type: 'integer' } },
          required: ['service', 'amount'],
          additionalProperties: false,
        },
      },
    },
    required: ['reply', 'action', 'lang', 'prices_mentioned'],
    additionalProperties: false,
  };
}

export function buildSystem(knowledge, prices) {
  return `${knowledge}

## Price table (the only prices that exist; from the same file as the Services panel)
${priceTable(prices)}

## How to reply
- Reply in JSON matching the schema. "reply" is what the visitor reads (lowercase, plain text, no markdown, no links:
  buttons are added for you). Keep it under about 90 words unless the visitor asks for full details.
- "action" adds one button: "services" for prices and packages, "work" for projects, "about" for Olga's background,
  "book" to offer the free consultation, "none" otherwise.
- "lang": the language you replied in. Use the visitor's language.
- "prices_mentioned": every price in your reply, as {service, amount} using the keys in [brackets] above; [] if none.`;
}
