import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router не скидає позицію прокрутки при переході між сторінками —
 * тому з прогорнутої галереї користувач потрапляв на лендінг у ту саму
 * точку прокрутки, тобто «в середину» сторінки.
 *
 * Якорі (#faq тощо) не чіпаємо: там прокрутку робить сам браузер.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    // instant, а не smooth: html має scroll-behavior: smooth, і без цього
    // зміна сторінки супроводжувалась би довгим проїздом через увесь контент.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);

  return null;
}
