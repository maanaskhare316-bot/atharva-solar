/**
 * Atharva Enterprises - Solar Brands Showcase Data & Vector Brand Marks
 * High-fidelity, authentic vector artwork and specifications for 8 featured solar brands.
 * Note: Presented strictly as available products / components, subject to market availability.
 */

const BrandLogos = {
  // 1. Adani Solar - Real Corporate Identity
  'Adani Solar': `
    <svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" class="brand-logo-svg" role="img" aria-label="Adani Solar Logo">
      <defs>
        <linearGradient id="adani-sun-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FFC20E"/>
          <stop offset="50%" stop-color="#F58220"/>
          <stop offset="100%" stop-color="#E53935"/>
        </linearGradient>
        <linearGradient id="adani-blue-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1B4F9C"/>
          <stop offset="100%" stop-color="#0E2D5B"/>
        </linearGradient>
      </defs>
      <!-- Solar Sun Emblem -->
      <g transform="translate(6, 12)">
        <circle cx="23" cy="23" r="21" fill="url(#adani-sun-grad)"/>
        <path d="M23 2 A 21 21 0 0 1 44 23 L 23 23 Z" fill="#FFE082" opacity="0.9"/>
        <circle cx="23" cy="23" r="14" fill="#FFFFFF"/>
        <path d="M12 23 A 11 11 0 0 1 34 23" stroke="#F58220" stroke-width="3" stroke-linecap="round"/>
        <circle cx="23" cy="18" r="3.5" fill="#E53935"/>
      </g>
      <!-- Wordmark: adani -->
      <text x="64" y="44" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="900" font-size="34" fill="url(#adani-blue-grad)" letter-spacing="-1">adani</text>
      <!-- Wordmark: SOLAR -->
      <text x="168" y="44" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="800" font-size="22" fill="#F58220" letter-spacing="2">SOLAR</text>
      <!-- Subtle tier-1 tag -->
      <text x="169" y="56" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="700" font-size="7.5" fill="#64748B" letter-spacing="1.5">TIER-1 PV MODULES</text>
    </svg>
  `,

  // 2. Tata Power Solar - Real Corporate Identity
  'Tata Power Solar': `
    <svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" class="brand-logo-svg" role="img" aria-label="Tata Power Solar Logo">
      <defs>
        <linearGradient id="tata-blue-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0077C8"/>
          <stop offset="100%" stop-color="#003A70"/>
        </linearGradient>
      </defs>
      <!-- Tata Blue Oval & Monogram T -->
      <g transform="translate(6, 12)">
        <rect x="0" y="0" width="46" height="46" rx="23" fill="url(#tata-blue-grad)"/>
        <!-- Iconic stylized TATA T -->
        <path d="M11 15 C 19 13, 27 13, 35 15 M 23 15 V 34" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M16 22 H 30" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
      </g>
      <!-- TATA POWER -->
      <text x="62" y="32" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="900" font-size="20" fill="#003A70" letter-spacing="1.5">TATA POWER</text>
      <!-- SOLAR -->
      <text x="63" y="52" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="800" font-size="18" fill="#00A3E0" letter-spacing="3.5">SOLAR</text>
      <!-- Quality badge -->
      <text x="160" y="52" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="700" font-size="8" fill="#059669" letter-spacing="1">TRUSTED LEGACY</text>
    </svg>
  `,

  // 3. Waaree - Real Corporate Identity
  'Waaree': `
    <svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" class="brand-logo-svg" role="img" aria-label="Waaree Logo">
      <!-- Sun burst symbol -->
      <g transform="translate(6, 11)">
        <circle cx="24" cy="24" r="18" fill="#E31E24"/>
        <!-- Sun rays -->
        <path d="M24 0 V 6 M24 42 V 48 M0 24 H 6 M42 24 H 48 M7 7 L 11 11 M37 37 L 41 41 M7 41 L 11 37 M37 7 L 41 11" stroke="#E31E24" stroke-width="3" stroke-linecap="round"/>
        <!-- Inner white sun -->
        <circle cx="24" cy="24" r="8" fill="#FFFFFF"/>
        <circle cx="24" cy="24" r="4.5" fill="#E31E24"/>
      </g>
      <!-- WAAREE wordmark -->
      <text x="64" y="41" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="900" font-size="33" fill="#1C355E" letter-spacing="1">WAAREE</text>
      <!-- One with the sun -->
      <text x="66" y="55" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="700" font-size="10" fill="#E31E24" letter-spacing="2.5">ONE WITH THE SUN</text>
    </svg>
  `,

  // 4. Avaada Solar - Real Corporate Identity
  'Avaada Solar': `
    <svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" class="brand-logo-svg" role="img" aria-label="Avaada Solar Logo">
      <defs>
        <linearGradient id="avaada-leaf-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#10B981"/>
          <stop offset="60%" stop-color="#059669"/>
          <stop offset="100%" stop-color="#047857"/>
        </linearGradient>
      </defs>
      <!-- Infinite clean energy loop motif -->
      <g transform="translate(6, 12)">
        <path d="M6 32 C 2 16, 22 8, 34 18 C 44 26, 20 44, 8 36 Z" fill="url(#avaada-leaf-grad)"/>
        <path d="M24 14 C 36 6, 44 22, 34 32 C 24 42, 10 24, 24 14 Z" fill="#047857" opacity="0.45"/>
        <circle cx="23" cy="23" r="5" fill="#FFB81C"/>
      </g>
      <!-- AVAADA -->
      <text x="62" y="42" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="900" font-size="31" fill="#064E3B" letter-spacing="1.2">AVAADA</text>
      <!-- SOLAR -->
      <text x="198" y="42" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="800" font-size="16" fill="#10B981" letter-spacing="1.5">SOLAR</text>
      <text x="64" y="55" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="650" font-size="8.5" fill="#059669" letter-spacing="2">CLEAN ENERGY & POWER</text>
    </svg>
  `,

  // 5. RenewSys - Real Corporate Identity
  'RenewSys': `
    <svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" class="brand-logo-svg" role="img" aria-label="RenewSys Logo">
      <!-- Diamond / Solar cell geometric emblem -->
      <g transform="translate(6, 12)">
        <rect x="13" y="13" width="26" height="26" rx="4" transform="rotate(45 26 26)" fill="#0284C7"/>
        <rect x="17" y="17" width="18" height="18" rx="2" transform="rotate(45 26 26)" fill="#84CC16"/>
        <circle cx="26" cy="26" r="3.5" fill="#FFFFFF"/>
      </g>
      <!-- RenewSys wordmark -->
      <text x="64" y="42" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="900" font-size="30" fill="#0C2340" letter-spacing="-0.5">Renew<tspan fill="#65A30D">Sys</tspan></text>
      <!-- Slogan -->
      <text x="65" y="56" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="700" font-size="9.5" fill="#475569" letter-spacing="2.2">LET THERE BE LIGHT</text>
    </svg>
  `,

  // 6. Luminous - Real Corporate Identity
  'Luminous': `
    <svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" class="brand-logo-svg" role="img" aria-label="Luminous Logo">
      <defs>
        <linearGradient id="luminous-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#00529B"/>
          <stop offset="100%" stop-color="#002D62"/>
        </linearGradient>
      </defs>
      <!-- Luminous Radiant Sun Power Icon -->
      <g transform="translate(6, 13)">
        <circle cx="22" cy="22" r="21" fill="url(#luminous-blue)"/>
        <!-- Power ray arc -->
        <path d="M22 8 V 20 M22 28 A 6 6 0 1 1 22 27.9" stroke="#FFC72C" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="22" cy="22" r="2.5" fill="#FF8200"/>
      </g>
      <!-- LUMINOUS -->
      <text x="60" y="42" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="900" font-size="28" fill="#002D62" letter-spacing="1">LUMINOUS</text>
      <!-- SOLAR -->
      <text x="206" y="42" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="800" font-size="15" fill="#FF8200" letter-spacing="1">SOLAR</text>
      <text x="61" y="55" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="700" font-size="8.5" fill="#00529B" letter-spacing="2">SMART POWER & INVERTERS</text>
    </svg>
  `,

  // 7. Sungrow - Real Corporate Identity
  'Sungrow': `
    <svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" class="brand-logo-svg" role="img" aria-label="Sungrow Logo">
      <!-- Sungrow Orange Sun Double Ring -->
      <g transform="translate(6, 13)">
        <circle cx="22" cy="22" r="20" stroke="#FF6A00" stroke-width="5" fill="none"/>
        <path d="M22 6 A 16 16 0 0 1 38 22" stroke="#FFA100" stroke-width="5" stroke-linecap="round"/>
        <circle cx="22" cy="22" r="7" fill="#FF6A00"/>
      </g>
      <!-- SUNGROW wordmark -->
      <text x="62" y="42" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="900" font-size="30" fill="#1E293B" letter-spacing="0.5">SUNGROW</text>
      <!-- Tagline -->
      <text x="64" y="55" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="700" font-size="9" fill="#FF6A00" letter-spacing="1.8">CLEAN POWER FOR ALL</text>
    </svg>
  `,

  // 8. Solitech Solar - Real Corporate Identity
  'Solitech Solar': `
    <svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" class="brand-logo-svg" role="img" aria-label="Solitech Solar Logo">
      <defs>
        <linearGradient id="solitech-cell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0E3A75"/>
          <stop offset="100%" stop-color="#071E3D"/>
        </linearGradient>
      </defs>
      <!-- High-tech PV Cell Grid -->
      <g transform="translate(6, 12)">
        <rect x="0" y="0" width="44" height="44" rx="8" fill="url(#solitech-cell)" stroke="#0284C7" stroke-width="2"/>
        <line x1="0" y1="15" x2="44" y2="15" stroke="#38BDF8" stroke-width="1.2" opacity="0.8"/>
        <line x1="0" y1="29" x2="44" y2="29" stroke="#38BDF8" stroke-width="1.2" opacity="0.8"/>
        <line x1="15" y1="0" x2="15" y2="44" stroke="#38BDF8" stroke-width="1.2" opacity="0.8"/>
        <line x1="29" y1="0" x2="29" y2="44" stroke="#38BDF8" stroke-width="1.2" opacity="0.8"/>
        <!-- Golden corner highlight -->
        <polygon points="36,0 44,0 44,8" fill="#F59E0B"/>
      </g>
      <!-- SOLITECH -->
      <text x="60" y="39" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="900" font-size="26" fill="#0A2540" letter-spacing="1">SOLITECH</text>
      <!-- SOLAR -->
      <text x="186" y="39" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="800" font-size="16" fill="#0284C7" letter-spacing="2">SOLAR</text>
      <text x="61" y="53" font-family="'Inter', 'Segoe UI', -apple-system, sans-serif" font-weight="650" font-size="8.5" fill="#475569" letter-spacing="1.2">HIGH-EFFICIENCY PHOTOVOLTAICS</text>
    </svg>
  `
};

if (typeof window !== 'undefined') {
  window.BrandLogos = BrandLogos;
}
