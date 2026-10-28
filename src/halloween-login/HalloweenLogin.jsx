import { useEffect } from 'react';
import { initHalloweenLogin } from './halloween-login';
import './halloween-login.css';

/**
 * Хеловін на сторінці входу. Монтується ОДИН раз на сторінці логіну, нічого не рендерить.
 * Поза періодом 24.10–02.11 нічого не робить. Перевірка в будь-який день: ?halloween=1 в URL.
 *
 * <HalloweenLogin />                     — селектори за замовчуванням (атрибути data-hw-login-*)
 * <HalloweenLogin options={{ ... }} />   — перевизначити селектори (див. DEFAULTS у halloween-login.js)
 */
export default function HalloweenLogin({ options }) {
  useEffect(() => {
    // невелика затримка, щоб сторінка встигла відмалювати форму й панель
    let destroy = () => {};
    const id = requestAnimationFrame(() => { destroy = initHalloweenLogin(options); });
    return () => { cancelAnimationFrame(id); destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
