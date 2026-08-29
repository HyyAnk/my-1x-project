export const QUESTION_KEYWORD_STOP_WORDS = new Set([
  "about",
  "animal",
  "bright",
  "blue",
  "cartoon",
  "child",
  "clear",
  "colorful",
  "cool",
  "cute",
  "educational",
  "friendly",
  "globe",
  "green",
  "image",
  "illustration",
  "large",
  "object",
  "picture",
  "red",
  "scene",
  "showing",
  "simple",
  "soft",
  "subject",
  "warm",
  "with",
]);

export function esc(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function escAttr(value: string): string {
  return esc(value);
}

export function highlightQuestionMarkup(question: string, visualOpportunity: string): string {
  const opportunityTokens = new Set(
    [...visualOpportunity.matchAll(/[\p{L}\p{N}]+/gu)]
      .map((match) => match[0].toLocaleLowerCase())
      .filter((token) => token.length >= 4 && !QUESTION_KEYWORD_STOP_WORDS.has(token)),
  );
  const questionTokens = [...question.matchAll(/[\p{L}\p{N}]+/gu)];
  const match = questionTokens.find((token) => opportunityTokens.has(token[0].toLocaleLowerCase()));
  if (!match || match.index === undefined) return esc(question);
  const end = match.index + match[0].length;
  return `${esc(question.slice(0, match.index))}<strong class="keyword-highlight">${esc(question.slice(match.index, end))}</strong>${esc(question.slice(end))}`;
}

export function illustrationDataUri(subject: string, seed: number): string {
  const hue = (seed * 41) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue} 92% 66%)"/><stop offset="1" stop-color="hsl(${(hue + 55) % 360} 82% 48%)"/></linearGradient></defs><rect width="800" height="520" rx="58" fill="url(#g)"/><g opacity=".18" fill="#fff"><circle cx="91" cy="103" r="40"/><circle cx="694" cy="108" r="61"/><circle cx="707" cy="419" r="32"/></g>${fallbackSubjectArtwork(subject, hue)}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function fallbackSubjectArtwork(subject: string, hue: number): string {
  const value = subject.toLocaleLowerCase();
  if (/(ocean|pacific|earth|planet|globe)/.test(value))
    return `<circle cx="400" cy="255" r="150" fill="#dff7ff"/><path d="M270 180c50-38 83 16 120 2s64-47 120-20 52 51 39 91c-22 69-97 123-176 128-79-6-135-59-146-117 3-38 8-58 43-84Z" fill="#35b7e6"/><path d="M315 183c34 11 43 43 74 38 35-5 46-41 91-29 31 8 53 24 67 48M266 266c53-25 68 20 110 13 48-8 58-41 108-27 25 7 44 18 61 37M300 328c49-22 82 13 123 4 35-8 59-36 91-13" fill="none" stroke="#fff" stroke-width="20" stroke-linecap="round"/><circle cx="454" cy="189" r="22" fill="#a6e368"/><path d="M328 262c20-31 54-36 76-15-24 8-42 33-49 58-28-6-44-21-27-43Z" fill="#a6e368"/>`;
  if (/cheetah/.test(value))
    return `<path d="M158 320c70-14 102-66 177-53 76 13 110-34 176-11 42 15 82 50 102 83l-33 20-54-29-18 65-50-7-24-74-102 8-48 70-50-11 29-70-82 16Z" fill="#ffbf4c"/><circle cx="559" cy="259" r="63" fill="#ffbf4c"/><path d="M546 205l24-38 23 42M597 208l38-21-13 44" fill="#ffbf4c"/><circle cx="577" cy="247" r="7" fill="#26355b"/><circle cx="614" cy="247" r="7" fill="#26355b"/><path d="M582 275q17 14 34 0" stroke="#26355b" stroke-width="8" fill="none" stroke-linecap="round"/>${Array.from({ length: 13 }, (_, index) => `<circle cx="${235 + ((index * 47) % 295)}" cy="${278 + ((index * 31) % 85)}" r="9" fill="#74453c"/>`).join("")}`;
  if (/elephant/.test(value))
    return `<circle cx="400" cy="260" r="143" fill="#aeb9ca"/><circle cx="279" cy="266" r="89" fill="#c8d2df"/><circle cx="521" cy="266" r="89" fill="#c8d2df"/><path d="M369 261c0 126 14 143 35 143s35-17 35-143v70c0 38 19 46 40 28" fill="none" stroke="#aeb9ca" stroke-width="43" stroke-linecap="round"/><circle cx="360" cy="237" r="10" fill="#243257"/><circle cx="440" cy="237" r="10" fill="#243257"/><path d="M374 280q26 20 52 0" stroke="#243257" stroke-width="9" fill="none" stroke-linecap="round"/>`;
  if (/turtle/.test(value))
    return `<ellipse cx="394" cy="277" rx="151" ry="112" fill="#45bd72"/><path d="M286 276q108-108 216 0-108 108-216 0Z" fill="#7bd75b"/><path d="M320 236l72 42-72 42M468 236l-72 42 72 42" fill="none" stroke="#42a860" stroke-width="17" stroke-linejoin="round"/><circle cx="560" cy="274" r="50" fill="#8be171"/><circle cx="574" cy="264" r="8" fill="#243257"/><path d="M573 293h15" stroke="#243257" stroke-width="8" stroke-linecap="round"/><ellipse cx="262" cy="188" rx="47" ry="24" fill="#8be171"/><ellipse cx="262" cy="358" rx="47" ry="24" fill="#8be171"/>`;
  if (/(geometric|shapes)/.test(value))
    return `<circle cx="253" cy="277" r="91" fill="#ffcf48" stroke="#fff" stroke-width="16"/><rect x="347" y="178" width="180" height="180" rx="22" fill="#5f70e8" stroke="#fff" stroke-width="16"/><path d="M614 161 741 380H487Z" fill="#4ed17a" stroke="#fff" stroke-width="16" stroke-linejoin="round"/>`;
  if (/triangle/.test(value))
    return `<path d="M400 103 654 401H146Z" fill="#ffd34d" stroke="#fff" stroke-width="18" stroke-linejoin="round"/>`;
  if (/square/.test(value)) return `<rect x="239" y="94" width="322" height="322" rx="24" fill="#5a69de" stroke="#fff" stroke-width="18"/>`;
  if (/circle|moon/.test(value))
    return `<circle cx="400" cy="255" r="154" fill="#ffd34d" stroke="#fff" stroke-width="18"/><circle cx="347" cy="203" r="24" fill="#f0ab3d" opacity=".6"/><circle cx="452" cy="302" r="32" fill="#f0ab3d" opacity=".6"/>`;
  if (/comet/.test(value))
    return `<path d="M185 360c121-20 200-90 287-218-22 128-82 223-211 276Z" fill="#fff4b0" opacity=".72"/><circle cx="514" cy="150" r="84" fill="#fff4b0"/><path d="M480 116l68 68M548 116l-68 68" stroke="#ff9c49" stroke-width="18" stroke-linecap="round"/>`;
  if (/(leaf|plant|carbon|dioxide|gas)/.test(value))
    return `<path d="M390 416c6-143 59-228 167-286-7 117-55 223-167 286Z" fill="#6fd66a"/><path d="M388 416C299 346 255 263 254 143c111 39 165 129 134 273Z" fill="#9fe779"/><path d="M398 406 306 193M398 406 520 177" stroke="#2f9867" stroke-width="16" stroke-linecap="round"/>`;
  return `<circle cx="400" cy="255" r="160" fill="#fff" opacity=".94"/><path d="M400 156l31 63 70 10-51 50 12 70-62-33-62 33 12-70-51-50 70-10z" fill="hsl(${(hue + 35) % 360} 95% 52%)"/>`;
}
