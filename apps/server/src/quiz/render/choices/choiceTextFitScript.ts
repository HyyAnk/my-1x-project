import { choiceTextFitPolicyScript } from "./choiceTextFitPolicy.js";

export function choiceTextFitScript(): string {
  return `${choiceTextFitPolicyScript()}
function fitChoiceGroups() {
  const groups=document.querySelectorAll('.choice-group[data-choice-fit-status="pending"]');
  let overflowGroups=0;

  groups.forEach(function(group) {
    const tokens=readChoiceFitTokens(group);
    const result=resolveChoiceGroupFit({
      minFontSize:tokens.minFontSize,
      maxFontSize:tokens.maxFontSize,
      maxLines:tokens.maxLines,
      multilineGain:tokens.multilineGain,
      fits:function(fontSize,lines) {
        applyChoiceFitCandidate(group,fontSize,lines,tokens.leading);
        return measureChoiceGroup(group,fontSize,lines,tokens.leading);
      }
    });

    applyChoiceFitResult(group,result,tokens.leading);
    if (result.status==='overflow') overflowGroups+=1;
  });

  return {groups:groups.length,overflowGroups:overflowGroups};
}

function resetChoiceGroupsToFallback(error) {
  const groups=document.querySelectorAll('.choice-group');
  groups.forEach(function(group) {
    group.style.removeProperty('--choice-fitted-font-size');
    group.style.removeProperty('--choice-fitted-line-height');
    group.setAttribute('data-choice-fit-lines','1');
    group.setAttribute('data-choice-fit-status','fallback');
    group.removeAttribute('data-choice-fit-font-size');
  });
  const message=error && typeof error.message==='string'?error.message:String(error);
  return {groups:groups.length,overflowGroups:0,fallback:true,message:message};
}

function readChoiceFitTokens(group) {
  const styles=getComputedStyle(group);
  return {
    minFontSize:readChoiceFitToken(styles,'--choice-fit-min',24),
    maxFontSize:readChoiceFitToken(styles,'--choice-fit-max',64),
    maxLines:readChoiceFitToken(styles,'--choice-fit-max-lines',2),
    leading:readChoiceFitToken(styles,'--choice-fit-leading',1.08),
    multilineGain:readChoiceFitToken(styles,'--choice-fit-multiline-gain',6)
  };
}

function readChoiceFitToken(styles,name,fallback) {
  const value=Number.parseFloat(styles.getPropertyValue(name));
  return Number.isFinite(value)?value:fallback;
}

function applyChoiceFitCandidate(group,fontSize,lines,leading) {
  group.style.setProperty('--choice-fitted-font-size',fontSize+'px');
  group.style.setProperty('--choice-fitted-line-height',String(leading));
  group.setAttribute('data-choice-fit-lines',String(lines));
}

function measureChoiceGroup(group,fontSize,lines,leading) {
  const choices=Array.from(group.querySelectorAll('.choice-text'));
  const cards=Array.from(group.querySelectorAll('.choice-card'));
  return choices.length>0
    && measureElementWithin(group,group.parentElement)
    && cards.every(function(card) { return measureElementWithin(card,group); })
    && choices.every(function(choice) { return measureChoiceText(choice,fontSize,lines,leading); });
}

function measureElementWithin(element,container) {
  if (!container || element.parentElement!==container) return true;
  const metrics=[element.offsetLeft,element.offsetTop,element.offsetWidth,element.offsetHeight,container.clientWidth,container.clientHeight];
  if (!metrics.every(Number.isFinite)) return true;
  const tolerance=1;
  return element.offsetLeft>=-tolerance
    && element.offsetLeft+element.offsetWidth<=container.clientWidth+tolerance
    && element.offsetTop>=-tolerance
    && element.offsetTop+element.offsetHeight<=container.clientHeight+tolerance;
}

function measureChoiceText(choice,fontSize,lines,leading) {
  const surface=choice.closest('.choice-card-surface');
  if (!surface) return false;
  const surfaceStyles=getComputedStyle(surface);
  const textStyles=getComputedStyle(choice);
  const paddingTop=Number.parseFloat(surfaceStyles.paddingTop)||0;
  const paddingBottom=Number.parseFloat(surfaceStyles.paddingBottom)||0;
  const surfaceInnerHeight=Math.max(0,surface.clientHeight-paddingTop-paddingBottom);
  const computedLineHeight=Number.parseFloat(textStyles.lineHeight);
  const lineHeight=Number.isFinite(computedLineHeight)?computedLineHeight:fontSize*leading;
  const glyphOverflowAllowance=Math.max(1,Math.ceil(fontSize*.08));
  const heightLimit=Math.min(surfaceInnerHeight+1,lineHeight*lines+glyphOverflowAllowance);
  return choice.scrollWidth<=choice.clientWidth+1 && choice.scrollHeight<=heightLimit;
}

function applyChoiceFitResult(group,result,leading) {
  applyChoiceFitCandidate(group,result.fontSize,result.lines,leading);
  group.setAttribute('data-choice-fit-status',result.status);
  group.setAttribute('data-choice-fit-font-size',String(result.fontSize));
}`;
}
