import { factTextFitPolicyScript } from "./factTextFitPolicy.js";

export function factTextFitScript(): string {
  return `${factTextFitPolicyScript()}
function fitFactCards() {
  const cards = document.querySelectorAll('.fact-card');
  let overflowCount = 0;
  let firstOverflowMessage = '';

  cards.forEach(function(card) {
    const p = card.querySelector('p');
    if (!p) return;
    const sourceText = p.textContent || '';
    const section = card.closest('section');
    const questionId = (section && section.id) ? section.id : 'unknown';

    const result = resolveFactFit(function(fontSize, lineHeight, maxLines) {
      return measureFactText(card, p, fontSize, lineHeight, maxLines);
    });

    if (result.status === 'fit') {
      card.style.setProperty('--fact-fitted-font-size', result.fontSize + 'px');
      card.style.setProperty('--fact-fitted-line-height', String(result.lineHeight));
      card.setAttribute('data-fact-fit-status', 'fit');
      card.setAttribute('data-fact-fit-font-size', String(result.fontSize));
      p.style.fontSize = result.fontSize + 'px';
      p.style.lineHeight = String(result.lineHeight);
    } else {
      overflowCount += 1;
      card.setAttribute('data-fact-fit-status', 'overflow');
      card.setAttribute('data-fact-fit-font-size', '32');
      p.style.fontSize = '32px';
      p.style.lineHeight = '1.15';
      if (!firstOverflowMessage) {
        firstOverflowMessage = '[' + questionId + '] Fact text exceeds 3 lines at min 32px: "' + sourceText + '"';
      }
    }
  });

  return {
    cards: cards.length,
    overflowCount: overflowCount,
    message: firstOverflowMessage
  };
}

function measureFactText(card, p, fontSize, lineHeight, maxLines) {
  p.style.setProperty('--fact-fitted-font-size', fontSize + 'px');
  p.style.setProperty('--fact-fitted-line-height', String(lineHeight));
  p.style.fontSize = fontSize + 'px';
  p.style.lineHeight = String(lineHeight);
  p.style.maxHeight = 'none';
  p.style.overflow = 'visible';

  const cardStyle = getComputedStyle(card);
  const paddingTop = Number.parseFloat(cardStyle.paddingTop) || 16;
  const paddingBottom = Number.parseFloat(cardStyle.paddingBottom) || 16;
  const maxAvailableHeight = card.clientHeight > 0
    ? (card.clientHeight - paddingTop - paddingBottom)
    : 112;

  const paddingLeft = Number.parseFloat(cardStyle.paddingLeft) || 32;
  const paddingRight = Number.parseFloat(cardStyle.paddingRight) || 32;
  const maxAvailableWidth = card.clientWidth > 0
    ? (card.clientWidth - paddingLeft - paddingRight)
    : 1164;

  const pRect = p.getBoundingClientRect();
  const textHeight = p.scrollHeight || pRect.height;
  const singleLineHeight = fontSize * lineHeight;

  if (textHeight > maxAvailableHeight + 1.5) return false;

  let lineCount = 0;
  if (document.createRange && p.firstChild) {
    const range = document.createRange();
    range.selectNodeContents(p);
    const rects = Array.from(range.getClientRects());
    if (rects.length > 0) {
      const lineTops = [];
      for (let i = 0; i < rects.length; i++) {
        const top = Math.round(rects[i].top);
        if (!lineTops.some(function(t) { return Math.abs(t - top) <= 4; })) {
          lineTops.push(top);
        }
      }
      lineCount = lineTops.length;
    }
  }
  if (lineCount === 0) {
    lineCount = Math.round(textHeight / singleLineHeight);
  }
  if (lineCount > maxLines) return false;

  if (p.scrollWidth > maxAvailableWidth + 1.5) return false;

  return true;
}

function resetFactCardsToFallback(error) {
  const cards = document.querySelectorAll('.fact-card');
  cards.forEach(function(card) {
    card.style.removeProperty('--fact-fitted-font-size');
    card.style.removeProperty('--fact-fitted-line-height');
    card.setAttribute('data-fact-fit-status', 'fallback');
    const p = card.querySelector('p');
    if (p) {
      p.style.removeProperty('font-size');
      p.style.removeProperty('line-height');
    }
  });
  const message = error && typeof error.message === 'string' ? error.message : String(error);
  return {
    cards: cards.length,
    overflowCount: cards.length,
    fallback: true,
    message: message
  };
}
`;
}
