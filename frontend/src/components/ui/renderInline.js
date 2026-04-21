import { createElement } from 'react';

export function renderInline(text = '') {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => (
    part.startsWith('**')
      ? createElement('strong', { key: index }, part.slice(2, -2))
      : createElement('span', { key: index }, part)
  ));
}
