import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../ui/Button';
import ProgressBar from '../../ui/ProgressBar';
import { client } from '../../lib/amplify-client';
import { unwrap } from '../../lib/unwrap';
import { useAuth } from '../../context/AuthContext';
import CertificateDocument, { type CertificateData } from './CertificateDocument';

/**
 * Сертифікат студента: показ, друк, завантаження.
 *
 * Видає його адміністратор — тут лише перегляд. Тому екран мусить виразно
 * розрізняти три стани: порогу ще не досягнуто, досягнуто й чекає на
 * підтвердження, видано. Другий стан найважливіший: без нього людина, яка
 * набрала бали, бачила б порожню сторінку й вирішила, що щось зламалося.
 */
export default function CertificatePage() {
  const { userId } = useAuth();
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [points, setPoints] = useState({ total: 0, max: 100, passing: 70 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setError(null);
      const [certs, enrollments, courses, instructors] = await Promise.all([
        unwrap(client.models.Certificate.listCertificateByStudentId({ studentId: userId })),
        unwrap(client.models.CourseEnrollment.listCourseEnrollmentByStudentId({ studentId: userId })),
        unwrap(client.models.Course.list({ limit: 2 })),
        unwrap(client.models.Instructor.list({ limit: 5 })),
      ]);
      const course = courses[0];
      setPoints({
        total: enrollments[0]?.totalPoints ?? 0,
        max: course?.totalPoints ?? 100,
        passing: course?.passingPoints ?? 70,
      });
      const active = certs.find((c) => !c.revokedAt);
      if (active) {
        const teacher = [...instructors].sort((a, b) => a.order - b.order)[0];
        setCert({
          certificateNumber: active.certificateNumber,
          verificationCode: active.verificationCode,
          studentFullName: active.studentFullName,
          courseTitle: active.courseTitle,
          hours: active.hours ?? null,
          totalPoints: active.totalPoints,
          maxPoints: active.maxPoints,
          issuedAt: active.issuedAt,
          instructorName: teacher?.fullName ?? null,
          instructorPosition: teacher?.position ?? null,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити сертифікат');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Завантаження SVG: документ лишається текстовим і друкується без утрат. */
  function downloadSvg() {
    const svg = svgWrapRef.current?.querySelector('svg');
    if (!svg || !cert) return;
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const blob = new Blob([clone.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sertyfikat-${cert.certificateNumber}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <section className="container-content py-24">
        <p className="text-ink-mute">Завантажуємо…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="container-content py-24">
        <h1 className="text-2xl text-ink">Сертифікат не завантажився</h1>
        <p className="mt-3 text-ink-soft">{error}</p>
      </section>
    );
  }

  if (!cert) {
    const reached = points.total >= points.passing;
    return (
      <section className="container-content py-20">
        <div className="font-mono text-2xs tracking-widest text-violet-300">Сертифікат</div>
        <h1 className="mt-3 text-3xl text-ink">
          {reached ? 'Поріг пройдено — чекає на підтвердження' : 'Сертифікат ще не відкрито'}
        </h1>

        <div className="mt-8 max-w-xl rounded-[var(--radius-lg)] bg-space-800 p-6">
          <div className="font-mono text-2xs tracking-widest text-ink-mute">ВАШ РЕЗУЛЬТАТ</div>
          <div className="mt-2 font-display text-2xl text-ink">
            {points.total}
            <span className="text-ink-mute"> / {points.max}</span>
          </div>
          <div className="relative mt-4">
            <ProgressBar
              value={points.total}
              max={points.max}
              label="Набрані бали"
              tone="gold"
            />
            <span
              aria-hidden="true"
              className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-ink-mute"
              style={{ left: `${(points.passing / points.max) * 100}%` }}
            />
          </div>
          <p className="mt-4 text-ink-soft">
            {reached
              ? `Ви набрали ${points.total} балів із потрібних ${points.passing}. Сертифікат видає викладач — щойно він підтвердить, документ з’явиться тут.`
              : `Сертифікат видається від ${points.passing} балів. Лишилось набрати ${points.passing - points.total}.`}
          </p>
        </div>

        <Button as={Link} to="/learn" className="mt-8">
          До курсу
        </Button>
      </section>
    );
  }

  return (
    <section className="container-content py-14 md:py-20">
      <div className="print:hidden">
        <div className="font-mono text-2xs tracking-widest text-violet-300">Сертифікат</div>
        <h1 className="mt-3 text-3xl text-ink">Вітаємо з завершенням курсу</h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          Документ має публічний код перевірки — за ним будь-хто може пересвідчитись у
          справжності, не маючи доступу до вашого акаунта.
        </p>
      </div>

      <div
        ref={svgWrapRef}
        className="mt-8 overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-3)] print:mt-0 print:rounded-none print:shadow-none"
      >
        <CertificateDocument data={cert} />
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-3 print:hidden">
        <Button onClick={() => window.print()}>Зберегти як PDF</Button>
        <Button onClick={downloadSvg} variant="ghost">
          Завантажити SVG
        </Button>
        <span className="font-mono text-2xs text-ink-mute">
          № {cert.certificateNumber} · код {cert.verificationCode}
        </span>
      </div>

      <p className="mt-4 max-w-2xl text-sm text-ink-mute print:hidden">
        «Зберегти як PDF» відкриє вікно друку — оберіть призначення «Зберегти як PDF».
        Текст лишиться текстом, тож документ не розмиється при масштабуванні.
      </p>
    </section>
  );
}
