export const DESTINATION_TREASURE_SVG = `<svg class="destination-island-svg" viewBox="0 0 200 200" aria-hidden="true" data-layout-ignore>
<defs>
  <!-- Glow & Aura Gradients -->
  <radialGradient id="destAuraGlow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="rgba(254, 240, 138, 0.85)" />
    <stop offset="35%" stop-color="rgba(245, 158, 11, 0.5)" />
    <stop offset="70%" stop-color="rgba(217, 119, 6, 0.2)" />
    <stop offset="100%" stop-color="rgba(0, 0, 0, 0)" />
  </radialGradient>
  <radialGradient id="chestInnerGlow" cx="50%" cy="55%" r="50%">
    <stop offset="0%" stop-color="rgba(254, 240, 138, 0.95)" />
    <stop offset="45%" stop-color="rgba(245, 158, 11, 0.65)" />
    <stop offset="100%" stop-color="rgba(180, 83, 9, 0)" />
  </radialGradient>
  <linearGradient id="chestRayGrad" x1="0%" y1="100%" x2="0%" y2="0%">
    <stop offset="0%" stop-color="rgba(254, 240, 138, 0.65)" />
    <stop offset="55%" stop-color="rgba(253, 224, 71, 0.3)" />
    <stop offset="100%" stop-color="rgba(254, 240, 138, 0)" />
  </linearGradient>

  <!-- Island & Water Gradients -->
  <linearGradient id="seaWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.85" />
    <stop offset="55%" stop-color="#0284C7" stop-opacity="0.92" />
    <stop offset="100%" stop-color="#0369A1" stop-opacity="0.98" />
  </linearGradient>
  <linearGradient id="sandBaseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#FEF9C3" />
    <stop offset="22%" stop-color="#FDE047" />
    <stop offset="58%" stop-color="#F59E0B" />
    <stop offset="100%" stop-color="#B45309" />
  </linearGradient>

  <!-- Chest Wood Gradients -->
  <linearGradient id="chestWoodLit" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#934B18" />
    <stop offset="35%" stop-color="#6E320D" />
    <stop offset="70%" stop-color="#481C04" />
    <stop offset="100%" stop-color="#230B02" />
  </linearGradient>
  <linearGradient id="chestWoodDark" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#3B1705" />
    <stop offset="60%" stop-color="#230B02" />
    <stop offset="100%" stop-color="#120501" />
  </linearGradient>
  <linearGradient id="chestLidWood" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#AA571E" />
    <stop offset="25%" stop-color="#803B11" />
    <stop offset="65%" stop-color="#481C04" />
    <stop offset="100%" stop-color="#1F0A02" />
  </linearGradient>

  <!-- Gold & Metallic Gradients -->
  <linearGradient id="goldMetalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#FFFDF0" />
    <stop offset="18%" stop-color="#FEF08A" />
    <stop offset="42%" stop-color="#FACC15" />
    <stop offset="72%" stop-color="#D97706" />
    <stop offset="90%" stop-color="#92400E" />
    <stop offset="100%" stop-color="#542203" />
  </linearGradient>
  <radialGradient id="goldRivetGrad" cx="35%" cy="32%" r="65%">
    <stop offset="0%" stop-color="#FFFDF0" />
    <stop offset="35%" stop-color="#FDE047" />
    <stop offset="75%" stop-color="#D97706" />
    <stop offset="100%" stop-color="#451A03" />
  </radialGradient>
  <radialGradient id="ironHandleGrad" cx="30%" cy="30%" r="70%">
    <stop offset="0%" stop-color="#FEF08A" />
    <stop offset="45%" stop-color="#B45309" />
    <stop offset="80%" stop-color="#451A03" />
    <stop offset="100%" stop-color="#1C0B02" />
  </radialGradient>

  <!-- Gemstone Gradients -->
  <radialGradient id="rubyGemGrad" cx="35%" cy="30%" r="68%">
    <stop offset="0%" stop-color="#FFF" />
    <stop offset="22%" stop-color="#FECACA" />
    <stop offset="50%" stop-color="#EF4444" />
    <stop offset="82%" stop-color="#B91C1C" />
    <stop offset="100%" stop-color="#450A0A" />
  </radialGradient>
  <radialGradient id="sapphireGemGrad" cx="32%" cy="28%" r="70%">
    <stop offset="0%" stop-color="#FFF" />
    <stop offset="24%" stop-color="#BAE6FD" />
    <stop offset="52%" stop-color="#38BDF8" />
    <stop offset="80%" stop-color="#1D4ED8" />
    <stop offset="100%" stop-color="#081E48" />
  </radialGradient>
  <radialGradient id="emeraldGemGrad" cx="34%" cy="28%" r="68%">
    <stop offset="0%" stop-color="#FFF" />
    <stop offset="22%" stop-color="#A7F3D0" />
    <stop offset="50%" stop-color="#10B981" />
    <stop offset="80%" stop-color="#047857" />
    <stop offset="100%" stop-color="#064E3B" />
  </radialGradient>
  <radialGradient id="amethystGemGrad" cx="32%" cy="28%" r="70%">
    <stop offset="0%" stop-color="#FFF" />
    <stop offset="25%" stop-color="#F3E8FF" />
    <stop offset="55%" stop-color="#A855F7" />
    <stop offset="82%" stop-color="#7E22CE" />
    <stop offset="100%" stop-color="#3B0764" />
  </radialGradient>
  <radialGradient id="pearlShineGrad" cx="35%" cy="30%" r="65%">
    <stop offset="0%" stop-color="#FFFFFF" />
    <stop offset="45%" stop-color="#FEF3C7" />
    <stop offset="80%" stop-color="#E2E8F0" />
    <stop offset="100%" stop-color="#94A3B8" />
  </radialGradient>

  <!-- Reusable Components -->
  <g id="coinP">
    <ellipse cx="0" cy="0" rx="9.5" ry="5" fill="url(#goldMetalGrad)" stroke="#78350F" stroke-width="0.9" />
    <ellipse cx="0" cy="-0.6" rx="7.2" ry="3.2" fill="#FDE047" opacity="0.6" />
    <ellipse cx="-1.8" cy="-1.1" rx="2.8" ry="1.3" fill="#FFFDF0" opacity="0.85" />
  </g>
  <g id="coinEdge">
    <path d="M-9.5,0 C-9.5,2.8 9.5,2.8 9.5,0 L9.5,2.6 C9.5,5.4 -9.5,5.4 -9.5,2.6 Z" fill="#92400E" stroke="#542203" stroke-width="0.85" />
    <ellipse cx="0" cy="0" rx="9.5" ry="4.7" fill="url(#goldMetalGrad)" stroke="#78350F" stroke-width="0.9" />
    <ellipse cx="0" cy="-0.7" rx="7" ry="3" fill="#FDE047" opacity="0.7" />
    <ellipse cx="-2.2" cy="-1.4" rx="3" ry="1.3" fill="#FFFDF0" opacity="0.9" />
  </g>
  <g id="domedRivet">
    <circle cx="0" cy="0" r="3.6" fill="url(#goldRivetGrad)" stroke="#3E1502" stroke-width="0.8" />
    <circle cx="-1" cy="-1" r="1.2" fill="#FFFDF0" opacity="0.9" />
  </g>
  <g id="domedRivetSm">
    <circle cx="0" cy="0" r="2.5" fill="url(#goldRivetGrad)" stroke="#3E1502" stroke-width="0.65" />
    <circle cx="-0.7" cy="-0.7" r="0.9" fill="#FFFDF0" opacity="0.85" />
  </g>
  <g id="sparkle4">
    <polygon points="0,-8 2,-2 8,0 2,2 0,8 -2,2 -8,0 -2,-2" fill="#FFFDF0" />
    <polygon points="0,-4.5 1.2,-1.2 4.5,0 1.2,1.2 0,4.5 -1.2,1.2 -4.5,0 -1.2,-1.2" fill="#FDE047" />
  </g>
</defs>

<!-- 1. Background Magic Aura & Light Beams -->
<ellipse cx="100" cy="100" rx="98" ry="85" fill="url(#destAuraGlow)" />
<g opacity="0.75">
  <polygon points="100,90 40,8 62,2" fill="url(#chestRayGrad)" />
  <polygon points="100,90 78,-2 100,-4" fill="url(#chestRayGrad)" />
  <polygon points="100,90 118,-2 140,4" fill="url(#chestRayGrad)" />
  <polygon points="100,90 155,14 175,28" fill="url(#chestRayGrad)" />
</g>

<!-- 2. Tropical Treasure Island Base & Sea Shore -->
<!-- Coastal water ripple -->
<ellipse cx="100" cy="170" rx="92" ry="20" fill="url(#seaWaterGrad)" />
<ellipse cx="100" cy="168" rx="86" ry="16" fill="none" stroke="#BAE6FD" stroke-width="2" stroke-dasharray="10 8" opacity="0.9" />
<ellipse cx="100" cy="169" rx="80" ry="14" fill="none" stroke="#E0F2FE" stroke-width="1.3" stroke-dasharray="6 14" opacity="0.65" />

<!-- Sand beach islet -->
<path d="M10,164 C10,140 52,130 100,130 C148,130 190,140 190,164 C190,182 148,193 100,193 C52,193 10,182 10,164 Z" fill="url(#sandBaseGrad)" stroke="#78350F" stroke-width="2.8" />
<!-- Sunny sand dune elevation -->
<ellipse cx="100" cy="156" rx="76" ry="15" fill="#FEF08A" opacity="0.5" />

<!-- Tropical Palm Fronds on Left (Pirate Island flair) -->
<g filter="drop-shadow(0 2.5px 5px rgba(0,0,0,0.5))">
  <!-- Back palm frond -->
  <path d="M38,130 Q12,100 6,68 Q22,85 36,108 Z" fill="#14532D" stroke="#052E16" stroke-width="1.2" />
  <path d="M42,128 Q10,82 26,48 Q34,74 48,100 Z" fill="#166534" stroke="#052E16" stroke-width="1.3" />
  <!-- Fore palm fronds -->
  <path d="M44,128 Q18,74 40,38 Q44,64 54,92 Z" fill="#15803D" stroke="#14532D" stroke-width="1.3" />
  <path d="M48,126 Q32,62 62,34 Q56,60 62,88 Z" fill="#22C55E" stroke="#14532D" stroke-width="1.3" />
  <path d="M48,126 Q46,66 78,46 Q68,70 66,92 Z" fill="#4ADE80" stroke="#15803D" stroke-width="1.1" opacity="0.95" />
  <!-- Palm frond center stems -->
  <path d="M44,128 Q18,74 40,38" fill="none" stroke="#86EFAC" stroke-width="1.3" stroke-linecap="round" />
  <path d="M48,126 Q32,62 62,34" fill="none" stroke="#BBF7D0" stroke-width="1.3" stroke-linecap="round" />
</g>

<!-- Pirate 'X Marks The Spot' -->
<g filter="drop-shadow(0 2px 3px rgba(69,26,3,0.75))">
  <path d="M26,152 Q35,162 46,172 M46,152 Q35,162 26,172" stroke="#DC2626" stroke-width="5.5" stroke-linecap="round" />
  <path d="M27,153 L45,171 M45,153 L27,171" stroke="#EF4444" stroke-width="2.8" stroke-linecap="round" />
  <circle cx="36" cy="162" r="1.8" fill="#FEE2E2" />
</g>

<!-- 3. Ground Shadow Under Chest -->
<ellipse cx="102" cy="156" rx="66" ry="14" fill="#240A01" opacity="0.8" />

<!-- 4. Open Chest Lid (Tilted Back in Grand 3D Perspective) -->
<g id="chestLidGroup">
  <!-- Inner lid cavity (dark mahogany with warm golden reflection) -->
  <path d="M36,92 Q102,74 168,92 L164,56 Q102,36 40,56 Z" fill="url(#chestWoodDark)" stroke="#1A0902" stroke-width="2.4" />
  <ellipse cx="102" cy="68" rx="52" ry="16" fill="url(#chestInnerGlow)" opacity="0.8" />

  <!-- Arched outer wooden roof staves -->
  <path d="M40,56 Q102,32 164,56 L162,68 Q102,44 42,68 Z" fill="url(#chestLidWood)" stroke="#1A0902" stroke-width="2.2" />
  <path d="M42,68 Q102,44 162,68 L164,80 Q102,56 40,80 Z" fill="url(#chestWoodLit)" stroke="#1A0902" stroke-width="2" />
  <!-- Lid plank grooves -->
  <path d="M41,62 Q102,38 163,62" fill="none" stroke="#230B02" stroke-width="1.6" />
  <path d="M41,74 Q102,50 163,74" fill="none" stroke="#230B02" stroke-width="1.6" />

  <!-- Gold bands across arched lid -->
  <!-- Left lid strap -->
  <path d="M66,51 Q68,39 71,34 L83,35 Q80,41 78,54 Z" fill="url(#goldMetalGrad)" stroke="#542203" stroke-width="1.1" />
  <path d="M68,60 Q70,70 73,83 L85,81 Q82,69 80,60 Z" fill="url(#goldMetalGrad)" stroke="#542203" stroke-width="1.1" />
  <!-- Right lid strap -->
  <path d="M124,53 Q126,41 131,35 L143,37 Q138,43 136,55 Z" fill="url(#goldMetalGrad)" stroke="#542203" stroke-width="1.1" />
  <path d="M124,60 Q125,70 128,82 L140,80 Q137,69 136,60 Z" fill="url(#goldMetalGrad)" stroke="#542203" stroke-width="1.1" />

  <!-- Lid rivets -->
  <use href="#domedRivetSm" x="77" y="46" />
  <use href="#domedRivetSm" x="78" y="73" />
  <use href="#domedRivetSm" x="134" y="47" />
  <use href="#domedRivetSm" x="133" y="72" />

  <!-- Heavy Gold Rim along lid lip -->
  <path d="M34,91 Q102,72 170,91 L168,98 Q102,79 36,98 Z" fill="url(#goldMetalGrad)" stroke="#542203" stroke-width="1.6" />
  <path d="M36,92 Q102,74 168,92" fill="none" stroke="#FFFDF0" stroke-width="1.3" opacity="0.85" />
</g>

<!-- 5. Overflowing Legendary Riches (Mound of Coins, Gems, Crown) -->
<g id="treasureLoot">
  <!-- Glowing golden aura inside chest -->
  <ellipse cx="102" cy="96" rx="55" ry="18" fill="url(#chestInnerGlow)" />

  <!-- Pirate Royal Crown peeking from loot -->
  <g transform="translate(122, 68) rotate(13)">
    <polygon points="0,18 7,4 14,13 21,0 28,13 35,4 42,18" fill="url(#goldMetalGrad)" stroke="#78350F" stroke-width="1.3" />
    <rect x="0" y="17" width="42" height="6" rx="1.8" fill="url(#goldMetalGrad)" stroke="#78350F" stroke-width="1.2" />
    <circle cx="21" cy="4" r="2.5" fill="url(#rubyGemGrad)" stroke="#450A0A" stroke-width="0.7" />
    <circle cx="7" cy="8" r="2" fill="url(#sapphireGemGrad)" stroke="#081E48" stroke-width="0.7" />
    <circle cx="35" cy="8" r="2" fill="url(#emeraldGemGrad)" stroke="#064E3B" stroke-width="0.7" />
    <circle cx="21" cy="20" r="1.8" fill="#FFFDF0" />
  </g>

  <!-- Deep coin layer -->
  <g>
    <use href="#coinP" x="58" y="90" transform="rotate(-15 58 90)" />
    <use href="#coinP" x="74" y="86" transform="rotate(8 74 86)" />
    <use href="#coinP" x="92" y="84" transform="rotate(-6 92 84)" />
    <use href="#coinP" x="110" y="85" transform="rotate(12 110 85)" />
    <use href="#coinP" x="128" y="88" transform="rotate(-10 128 88)" />
    <use href="#coinP" x="144" y="92" transform="rotate(20 144 92)" />
  </g>

  <!-- Mid coin layer (dense mound) -->
  <g>
    <use href="#coinP" x="52" y="96" transform="rotate(25 52 96)" />
    <use href="#coinP" x="66" y="94" transform="rotate(-8 66 94)" />
    <use href="#coinP" x="80" y="91" transform="rotate(14 80 91)" />
    <use href="#coinP" x="98" y="90" transform="rotate(-4 98 90)" />
    <use href="#coinP" x="116" y="92" transform="rotate(16 116 92)" />
    <use href="#coinP" x="134" y="95" transform="rotate(-18 134 95)" />
    <use href="#coinP" x="150" y="98" transform="rotate(8 150 98)" />
  </g>

  <!-- Cascading front coins (spilling over the lip) -->
  <g>
    <use href="#coinEdge" x="56" y="102" transform="rotate(18 56 102)" />
    <use href="#coinEdge" x="72" y="100" transform="rotate(-12 72 100)" />
    <use href="#coinEdge" x="88" y="98" transform="rotate(6 88 98)" />
    <use href="#coinEdge" x="104" y="97" transform="rotate(-14 104 97)" />
    <use href="#coinEdge" x="122" y="99" transform="rotate(10 122 99)" />
    <use href="#coinEdge" x="138" y="102" transform="rotate(-22 138 102)" />
    <use href="#coinEdge" x="80" y="106" transform="rotate(24 80 106)" />
    <use href="#coinEdge" x="98" y="105" transform="rotate(-8 98 105)" />
    <use href="#coinEdge" x="114" y="106" transform="rotate(15 114 106)" />
    <use href="#coinEdge" x="130" y="107" transform="rotate(-12 130 107)" />
  </g>

  <!-- Giant Royal Ruby (Faceted Hexagon/Octagon) -->
  <g transform="translate(92, 78)" filter="drop-shadow(0 2.5px 6px rgba(185,28,28,0.75))">
    <polygon points="9,0 19,0 26,7 26,17 19,24 9,24 2,17 2,7" fill="url(#rubyGemGrad)" stroke="#7F1D1D" stroke-width="1.3" />
    <polygon points="9,0 19,0 23,6 5,6" fill="#FECACA" opacity="0.88" />
    <polygon points="5,6 23,6 23,18 5,18" fill="#EF4444" opacity="0.6" />
    <polygon points="23,6 26,7 26,17 23,18" fill="#991B1B" />
    <polygon points="5,6 2,7 2,17 5,18" fill="#F87171" opacity="0.75" />
    <polygon points="5,18 23,18 19,24 9,24" fill="#450A0A" />
    <circle cx="10" cy="5" r="1.8" fill="#FFFFFF" />
  </g>

  <!-- Brilliant Blue Sapphire (Faceted Diamond) -->
  <g transform="translate(130, 84)" filter="drop-shadow(0 2.5px 6px rgba(29,78,216,0.75))">
    <polygon points="8,0 16,6 16,16 8,22 0,16 0,6" fill="url(#sapphireGemGrad)" stroke="#0C1E4F" stroke-width="1.2" />
    <polygon points="8,0 16,6 12,8 4,8 0,6" fill="#BAE6FD" opacity="0.9" />
    <polygon points="4,8 12,8 12,14 4,14" fill="#38BDF8" opacity="0.65" />
    <polygon points="12,8 16,6 16,16 12,14" fill="#1E3A8A" />
    <circle cx="7" cy="5" r="1.5" fill="#FFFFFF" />
  </g>

  <!-- Luminous Green Emerald (Step Cut) -->
  <g transform="translate(62, 82)" filter="drop-shadow(0 2.5px 6px rgba(4,120,87,0.75))">
    <polygon points="5,0 17,0 21,5 21,17 17,22 5,22 1,17 1,5" fill="url(#emeraldGemGrad)" stroke="#064E3B" stroke-width="1.2" />
    <polygon points="5,0 17,0 15,4 7,4" fill="#A7F3D0" opacity="0.9" />
    <polygon points="7,4 15,4 15,18 7,18" fill="#10B981" opacity="0.6" />
    <polygon points="15,4 21,5 21,17 15,18" fill="#065F46" />
    <polygon points="7,4 1,5 1,17 7,18" fill="#34D399" opacity="0.75" />
    <circle cx="7" cy="4" r="1.5" fill="#FFFFFF" />
  </g>

  <!-- Royal Amethyst Diamond Gem -->
  <g transform="translate(114, 90)" filter="drop-shadow(0 1.5px 5px rgba(126,34,206,0.65))">
    <polygon points="7,0 14,7 7,16 0,7" fill="url(#amethystGemGrad)" stroke="#3B0764" stroke-width="1.1" />
    <polygon points="7,0 14,7 7,8 0,7" fill="#F3E8FF" opacity="0.88" />
    <polygon points="0,7 7,8 7,16" fill="#A855F7" opacity="0.75" />
    <polygon points="14,7 7,8 7,16" fill="#581C87" />
    <circle cx="6" cy="5" r="1.2" fill="#FFFFFF" />
  </g>

  <!-- Draped Lustrous Pearl String across chest rim -->
  <g filter="drop-shadow(0 2px 4px rgba(0,0,0,0.55))">
    <circle cx="64" cy="106" r="3.6" fill="url(#pearlShineGrad)" stroke="#78350F" stroke-width="0.7" />
    <circle cx="69" cy="112" r="3.6" fill="url(#pearlShineGrad)" stroke="#78350F" stroke-width="0.7" />
    <circle cx="75" cy="117" r="3.8" fill="url(#pearlShineGrad)" stroke="#78350F" stroke-width="0.7" />
    <circle cx="82" cy="121" r="4" fill="url(#pearlShineGrad)" stroke="#78350F" stroke-width="0.7" />
    <circle cx="90" cy="123" r="4" fill="url(#pearlShineGrad)" stroke="#78350F" stroke-width="0.7" />
    <circle cx="98" cy="121" r="3.9" fill="url(#pearlShineGrad)" stroke="#78350F" stroke-width="0.7" />
    <circle cx="105" cy="117" r="3.6" fill="url(#pearlShineGrad)" stroke="#78350F" stroke-width="0.7" />
    <!-- Pearl glints -->
    <circle cx="63" cy="105" r="1.1" fill="#FFF" />
    <circle cx="68" cy="111" r="1.1" fill="#FFF" />
    <circle cx="74" cy="116" r="1.2" fill="#FFF" />
    <circle cx="81" cy="120" r="1.3" fill="#FFF" />
    <circle cx="89" cy="122" r="1.3" fill="#FFF" />
    <circle cx="97" cy="120" r="1.2" fill="#FFF" />
    <circle cx="104" cy="116" r="1.1" fill="#FFF" />
  </g>
</g>

<!-- 6. Chest Lower Body Box (Massive & Sturdy) -->
<g id="chestBodyGroup">
  <!-- Main wooden hull (spans x: 38 to 166, height 52) -->
  <path d="M38,106 L46,150 Q48,155 54,155 L150,155 Q156,155 158,150 L166,106 Z" fill="url(#chestWoodLit)" stroke="#1A0902" stroke-width="2.8" />

  <!-- Horizontal wood plank divider grooves -->
  <path d="M40,122 L164,122" stroke="#1F0A02" stroke-width="2.6" />
  <path d="M40,123 L164,123" stroke="#B45309" stroke-width="0.9" opacity="0.7" />
  <path d="M43,138 L161,138" stroke="#1F0A02" stroke-width="2.6" />
  <path d="M43,139 L161,139" stroke="#B45309" stroke-width="0.9" opacity="0.7" />

  <!-- Sturdy wooden base lip / footing -->
  <path d="M43,149 L47,156 Q48,158 54,158 L150,158 Q156,158 157,156 L161,149 Z" fill="url(#chestWoodDark)" stroke="#1A0902" stroke-width="2" />

  <!-- Heavy Gold Corner Braces (bottom left & right) -->
  <!-- Bottom Left Bracket -->
  <path d="M45,136 L58,136 L58,144 L52,144 L52,154 L45,153 Z" fill="url(#goldMetalGrad)" stroke="#542203" stroke-width="1.3" />
  <use href="#domedRivetSm" x="50" y="140" />
  <use href="#domedRivetSm" x="49" y="150" />

  <!-- Bottom Right Bracket -->
  <path d="M159,136 L146,136 L146,144 L152,144 L152,154 L159,153 Z" fill="url(#goldMetalGrad)" stroke="#542203" stroke-width="1.3" />
  <use href="#domedRivetSm" x="154" y="140" />
  <use href="#domedRivetSm" x="155" y="150" />

  <!-- Vertical Embossed Gold Straps -->
  <!-- Left Strap -->
  <rect x="68" y="106" width="14" height="49" fill="url(#goldMetalGrad)" stroke="#542203" stroke-width="1.5" />
  <rect x="71" y="106" width="4" height="49" fill="#FFFDF0" opacity="0.5" />
  <use href="#domedRivet" x="75" y="113" />
  <use href="#domedRivet" x="75" y="130" />
  <use href="#domedRivet" x="75" y="148" />

  <!-- Right Strap -->
  <rect x="122" y="106" width="14" height="49" fill="url(#goldMetalGrad)" stroke="#542203" stroke-width="1.5" />
  <rect x="125" y="106" width="4" height="49" fill="#FFFDF0" opacity="0.5" />
  <use href="#domedRivet" x="129" y="113" />
  <use href="#domedRivet" x="129" y="130" />
  <use href="#domedRivet" x="129" y="148" />

  <!-- Heavy Cast Brass Side Drop Handles -->
  <!-- Left Handle -->
  <g filter="drop-shadow(0 2.5px 4px rgba(0,0,0,0.65))">
    <ellipse cx="38" cy="126" rx="4.5" ry="8" fill="none" stroke="url(#ironHandleGrad)" stroke-width="3.4" />
    <circle cx="41" cy="126" r="4.8" fill="url(#goldMetalGrad)" stroke="#3E1502" stroke-width="1.1" />
    <use href="#domedRivetSm" x="41" y="126" />
  </g>
  <!-- Right Handle -->
  <g filter="drop-shadow(0 2.5px 4px rgba(0,0,0,0.65))">
    <ellipse cx="166" cy="126" rx="4.5" ry="8" fill="none" stroke="url(#ironHandleGrad)" stroke-width="3.4" />
    <circle cx="163" cy="126" r="4.8" fill="url(#goldMetalGrad)" stroke="#3E1502" stroke-width="1.1" />
    <use href="#domedRivetSm" x="163" y="126" />
  </g>

  <!-- Ornate Royal Lock Plate / Escutcheon -->
  <g filter="drop-shadow(0 3.5px 7px rgba(0,0,0,0.7))">
    <!-- Outer shield hasp -->
    <path d="M92,108 L112,108 L114,125 Q114,135 102,140 Q90,135 90,125 Z" fill="url(#goldMetalGrad)" stroke="#3E1502" stroke-width="1.8" />
    <!-- Inner bevel rim -->
    <path d="M94,110 L110,110 L111,123 Q111,132 102,136 Q93,132 93,123 Z" fill="#FDE047" opacity="0.4" />
    <!-- Decorative skull / crest medallion -->
    <circle cx="102" cy="118" r="3.6" fill="url(#goldRivetGrad)" stroke="#542203" stroke-width="0.9" />
    <circle cx="101" cy="117" r="1.2" fill="#FFFDF0" />
    <!-- Keyhole -->
    <circle cx="102" cy="127" r="2.6" fill="#1C0B02" stroke="#542203" stroke-width="0.6" />
    <polygon points="100.8,127 103.2,127 103.8,134 100.2,134" fill="#1C0B02" />
    <use href="#domedRivetSm" x="95" y="114" />
    <use href="#domedRivetSm" x="109" y="114" />
  </g>
</g>

<!-- 7. Spilled Gold & Gems on the Beach (Foreground Loot) -->
<g id="beachLoot" filter="drop-shadow(0 2.5px 5px rgba(69,26,3,0.65))">
  <!-- Coins scattered in sand -->
  <use href="#coinEdge" x="60" y="158" transform="rotate(-18 60 158)" />
  <use href="#coinEdge" x="74" y="162" transform="rotate(12 74 162)" />
  <use href="#coinEdge" x="87" y="159" transform="rotate(-6 87 159)" />
  <use href="#coinEdge" x="124" y="160" transform="rotate(14 124 160)" />
  <use href="#coinEdge" x="139" y="158" transform="rotate(-15 139 158)" />
  <use href="#coinEdge" x="152" y="163" transform="rotate(22 152 163)" />
  <use href="#coinP" x="110" y="164" transform="rotate(4 110 164)" />
  <use href="#coinP" x="48" y="166" transform="rotate(-25 48 166)" />

  <!-- Dropped Ruby near X -->
  <polygon points="40,165 46,162 51,166 47,172 41,171" fill="url(#rubyGemGrad)" stroke="#7F1D1D" stroke-width="0.9" />
  <!-- Dropped Sapphire on right -->
  <polygon points="132,163 138,161 142,165 138,170 132,168" fill="url(#sapphireGemGrad)" stroke="#0C1E4F" stroke-width="0.9" />
</g>

<!-- 8. Brilliant Specular Glints & Sparkles -->
<g filter="drop-shadow(0 0 8px rgba(253,224,71,0.95))">
  <use href="#sparkle4" x="94" y="80" transform="scale(1.3)" />
  <use href="#sparkle4" x="136" y="86" transform="scale(1)" />
  <use href="#sparkle4" x="64" y="84" transform="scale(0.95)" />
  <use href="#sparkle4" x="126" y="70" transform="scale(1.1)" />
  <use href="#sparkle4" x="102" y="108" transform="scale(1)" />
  <use href="#sparkle4" x="87" y="161" transform="scale(0.85)" />
  <!-- Floating magical sparkles -->
  <circle cx="80" cy="36" r="1.8" fill="#FFFDF0" />
  <circle cx="124" cy="32" r="2" fill="#FDE047" />
  <circle cx="58" cy="54" r="1.5" fill="#FEF08A" />
  <circle cx="150" cy="48" r="1.6" fill="#FFFDF0" />
</g>
</svg>`;
