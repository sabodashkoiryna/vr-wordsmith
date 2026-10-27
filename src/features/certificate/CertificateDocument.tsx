export type CertificateData = {
  certificateNumber: string;
  verificationCode: string;
  studentFullName: string;
  courseTitle: string;
  hours: number | null;
  totalPoints: number;
  maxPoints: number;
  issuedAt: string;
  instructorName?: string | null;
  instructorPosition?: string | null;
};

const MONTHS = [
  'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
  'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} року`;
}

/**
 * Сам документ сертифіката.
 *
 * SVG, а не зображення й не PDF з бібліотеки. Три причини: текст лишається
 * текстом (його можна виділити, він не розсипається при друку й не мутніє на
 * масштабуванні), кирилиця не потребує вбудовування шрифтів у PDF — класичне
 * місце, де такі проєкти застрягають, — і той самий компонент малює документ
 * і в кабінеті, і на публічній сторінці верифікації.
 *
 * Світлий навмисно, попри темний інтерфейс: його друкують.
 */
export default function CertificateDocument({ data }: { data: CertificateData }) {
  const W = 1123;
  const H = 794; // A4 альбомна, 96 dpi

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Сертифікат ${data.certificateNumber}, ${data.studentFullName}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        <linearGradient id="cert-accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5B3DF5" />
          <stop offset="55%" stopColor="#8B6BFF" />
          <stop offset="100%" stopColor="#35E1F0" />
        </linearGradient>
        <linearGradient id="cert-corner" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5B3DF5" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#35E1F0" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width={W} height={H} fill="#FFFFFF" />
      <path d={`M0 0 H${W * 0.42} L0 ${H * 0.46} Z`} fill="url(#cert-corner)" />
      <rect x="0" y="0" width={W} height="10" fill="url(#cert-accent)" />
      <rect
        x="38" y="38" width={W - 76} height={H - 76}
        fill="none" stroke="#E4E0F2" strokeWidth="1.5"
      />

      <text x="78" y="128" fontFamily="'IBM Plex Mono', monospace" fontSize="13"
        letterSpacing="3.4" fill="#6B6490">VR-СЛОВЕСНИК</text>
      <text x={W - 78} y="128" textAnchor="end" fontFamily="'IBM Plex Mono', monospace"
        fontSize="13" letterSpacing="2" fill="#6B6490">№ {data.certificateNumber}</text>

      <text x="78" y="226" fontFamily="'Unbounded', system-ui, sans-serif" fontSize="52"
        fontWeight="700" fill="#14121F">Сертифікат</text>
      <text x="78" y="266" fontFamily="'IBM Plex Sans', system-ui, sans-serif" fontSize="18"
        fill="#45406A">про успішне завершення онлайн-курсу</text>

      <text x="78" y="346" fontFamily="'IBM Plex Sans', system-ui, sans-serif" fontSize="15"
        letterSpacing="1.6" fill="#6B6490">ВИДАНО</text>
      <text x="78" y="404" fontFamily="'Unbounded', system-ui, sans-serif" fontSize="40"
        fontWeight="600" fill="#14121F">{data.studentFullName}</text>
      <rect x="78" y="424" width="300" height="3" fill="url(#cert-accent)" />

      <text x="78" y="486" fontFamily="'IBM Plex Sans', system-ui, sans-serif" fontSize="19"
        fill="#45406A">за опанування курсу</text>
      <text x="78" y="528" fontFamily="'IBM Plex Serif', Georgia, serif" fontSize="27"
        fontStyle="italic" fill="#14121F">«{data.courseTitle}»</text>

      <text x="78" y="586" fontFamily="'IBM Plex Sans', system-ui, sans-serif" fontSize="17"
        fill="#45406A">
        {data.hours ? `Обсяг — ${data.hours} годин. ` : ''}
        Підсумковий результат — {data.totalPoints} зі {data.maxPoints} балів.
      </text>

      {/* Ліва нижня колонка: дата й підпис */}
      <text x="78" y="672" fontFamily="'IBM Plex Mono', monospace" fontSize="12"
        letterSpacing="1.6" fill="#6B6490">ДАТА ВИДАЧІ</text>
      <text x="78" y="700" fontFamily="'IBM Plex Sans', system-ui, sans-serif" fontSize="17"
        fill="#14121F">{formatDate(data.issuedAt)}</text>

      {data.instructorName && (
        <>
          <line x1="430" y1="694" x2="690" y2="694" stroke="#C9C3E0" strokeWidth="1" />
          <text x="430" y="716" fontFamily="'IBM Plex Sans', system-ui, sans-serif"
            fontSize="14" fill="#14121F">{data.instructorName}</text>
          {data.instructorPosition && (
            <text x="430" y="736" fontFamily="'IBM Plex Sans', system-ui, sans-serif"
              fontSize="11.5" fill="#6B6490">{data.instructorPosition}</text>
          )}
        </>
      )}

      {/* Права нижня: код верифікації — головна причина, чому документ чогось вартий */}
      <text x={W - 78} y="652" textAnchor="end" fontFamily="'IBM Plex Mono', monospace"
        fontSize="12" letterSpacing="1.6" fill="#6B6490">КОД ПЕРЕВІРКИ</text>
      <text x={W - 78} y="690" textAnchor="end" fontFamily="'IBM Plex Mono', monospace"
        fontSize="26" letterSpacing="2.5" fill="#14121F">{data.verificationCode}</text>
      <text x={W - 78} y="716" textAnchor="end" fontFamily="'IBM Plex Sans', system-ui, sans-serif"
        fontSize="11.5" fill="#6B6490">Справжність можна перевірити на сайті курсу</text>
    </svg>
  );
}
