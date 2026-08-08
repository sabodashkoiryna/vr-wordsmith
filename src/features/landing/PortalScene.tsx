/**
 * Сцена всередині порталу: смерековий ліс трьома планами вглиб і двоє
 * на освітленій галявині — Іван і Марічка з «Тіней забутих предків».
 *
 * Кожен план — окремий .portal-layer із власною --depth, тож планами рухає
 * той самий механізм паралакса, що й рештою порталу: дальні смереки майже
 * стоять, ближні помітно їдуть за курсором. Це і створює відчуття, що
 * дивишся вглиб лісу, а не на пласку картинку.
 *
 * Повітряна перспектива: що далі план, то світліший і прозоріший силует —
 * так само, як туман з'їдає контраст у справжньому лісі.
 */

const SPRUCE_PATH =
  'M0,-30 L3,-23 L1.5,-23 L5,-15 L3,-15 L8,-6 L1,-6 L1,0 L-1,0 L-1,-6 L-8,-6 L-3,-15 L-5,-15 L-1.5,-23 L-3,-23 Z';

type Tree = { x: number; y: number; s: number };

/** Ряд смерек. Нерівні інтервали й масштаби — щоб не читалось як паркан. */
function SpruceRow({ trees, fill, opacity }: { trees: Tree[]; fill: string; opacity: number }) {
  return (
    <g fill={fill} opacity={opacity}>
      {trees.map((t, i) => (
        <path key={i} d={SPRUCE_PATH} transform={`translate(${t.x} ${t.y}) scale(${t.s})`} />
      ))}
    </g>
  );
}

function Layer({
  depth,
  children,
}: {
  depth: number;
  children: React.ReactNode;
}) {
  return (
    <div className="portal-layer" style={{ '--depth': depth } as React.CSSProperties}>
      <svg viewBox="0 0 100 110" className="h-full w-full" aria-hidden="true">
        {children}
      </svg>
    </div>
  );
}

export default function PortalScene() {
  return (
    <>
      {/* ---- Дальній план: смуга лісу на гребені, майже розчинена в тумані --- */}
      <Layer depth={10}>
        <SpruceRow
          fill="#4A3A9A"
          opacity={0.45}
          trees={[
            { x: 5, y: 49, s: 0.34 },
            { x: 13, y: 50, s: 0.28 },
            { x: 21, y: 49, s: 0.38 },
            { x: 30, y: 50, s: 0.3 },
            { x: 39, y: 49, s: 0.35 },
            { x: 50, y: 50, s: 0.26 },
            { x: 60, y: 49, s: 0.36 },
            { x: 69, y: 50, s: 0.29 },
            { x: 78, y: 49, s: 0.37 },
            { x: 87, y: 50, s: 0.31 },
            { x: 95, y: 49, s: 0.34 },
          ]}
        />
      </Layer>

      {/* ---- Середній план: ліс щільніший, центр лишаємо відкритим ---------- */}
      <Layer depth={18}>
        <SpruceRow
          fill="#2A1C6E"
          opacity={0.9}
          trees={[
            { x: 2, y: 63, s: 0.62 },
            { x: 11, y: 64, s: 0.5 },
            { x: 19, y: 62, s: 0.66 },
            { x: 27, y: 64, s: 0.46 },
            { x: 74, y: 64, s: 0.48 },
            { x: 82, y: 62, s: 0.64 },
            { x: 90, y: 64, s: 0.52 },
            { x: 98, y: 63, s: 0.6 },
          ]}
        />
      </Layer>

      {/* ---- Галявина: тепле світло, до якого виходять з лісу --------------- */}
      <Layer depth={14}>
        <defs>
          <radialGradient id="glade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFE0B8" stopOpacity="0.5" />
            <stop offset="55%" stopColor="#F0A46B" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#F0A46B" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="88" rx="30" ry="13" fill="url(#glade)" />
      </Layer>

      {/* ---- Іван і Марічка на галявині ------------------------------------ */}
      <Layer depth={24}>
        <g fill="#0B0722">
          {/* Марічка */}
          <g transform="translate(45.5 92) scale(0.95)">
            <circle cx="0" cy="-12.4" r="1.75" />
            {/* волосся */}
            <path d="M-1.9,-12.7 c0,-2 0.85,-3.1 1.9,-3.1 s1.9,1.1 1.9,3.1 l-0.35,1.5 c-0.5,-1.25 -1.1,-1.7 -1.55,-1.7 s-1.05,0.45 -1.55,1.7 z" />
            {/* сукня */}
            <path d="M0,-10.7 c2.15,0 3.05,1.3 3.05,3 l1.5,5.6 -9.1,0 1.5,-5.6 c0,-1.7 0.9,-3 3.05,-3 z" />
            {/* ноги */}
            <path d="M-1.55,-2.1 h1.15 l0.1,2.1 h-1.05z M0.4,-2.1 h1.15 l-0.2,2.1 h-1.05z" />
          </g>

          {/* Іван */}
          <g transform="translate(54.5 92) scale(1)">
            <circle cx="0" cy="-12.4" r="1.8" />
            {/* тулуб */}
            <path d="M0,-10.6 c2.35,0 3.35,1.4 3.35,3.2 l-0.6,4.5 -5.5,0 -0.6,-4.5 c0,-1.8 1,-3.2 3.35,-3.2 z" />
            {/* ноги */}
            <path d="M-2.35,-2.9 h1.85 l0.2,2.9 h-1.6z M0.5,-2.9 h1.85 l-0.45,2.9 h-1.6z" />
          </g>
        </g>
      </Layer>

      {/* ---- Ближній план: темні смереки обабіч, кадрують сцену ------------- */}
      <Layer depth={34}>
        <SpruceRow
          fill="#0C0722"
          opacity={1}
          trees={[
            { x: -3, y: 86, s: 1.15 },
            { x: 8, y: 92, s: 0.9 },
            { x: 92, y: 92, s: 0.95 },
            { x: 103, y: 86, s: 1.2 },
          ]}
        />
      </Layer>

      {/* ---- Найближчі смереки: майже за краєм кадру, найбільший зсув ------- */}
      <Layer depth={48}>
        <SpruceRow
          fill="#070417"
          opacity={1}
          trees={[
            { x: -8, y: 112, s: 1.9 },
            { x: 108, y: 112, s: 2 },
          ]}
        />
      </Layer>
    </>
  );
}
