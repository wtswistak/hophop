import { useEffect, useState } from 'react';

export function usePageActive() {
  const [active, setActive] = useState(
    () => !document.hidden && document.hasFocus(),
  );
  useEffect(() => {
    const update = () => setActive(!document.hidden && document.hasFocus());
    const blur = () => setActive(false);
    window.addEventListener('blur', blur);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      window.removeEventListener('blur', blur);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return active;
}
