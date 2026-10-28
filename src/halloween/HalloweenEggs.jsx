import { useEffect } from 'react';
import { initHalloween } from './halloween';
import './halloween.css';

/**
 * Хеловінські пасхалки. Монтується ОДИН раз у спільному layout (для всіх ролей), нічого не рендерить.
 * Поза періодом 24.10–02.11 модуль нічого не робить. Для перевірки в будь-який день: додати ?halloween=1 до URL.
 *
 * <HalloweenEggs />                       — з налаштуваннями за замовчуванням (селектори data-hw-*)
 * <HalloweenEggs options={{ ... }} />     — перевизначити селектори / інтервали (див. DEFAULTS у halloween.js)
 */
export default function HalloweenEggs({ options }) {
  useEffect(() => {
    const destroy = initHalloween(options);
    return destroy; // прибирає всі елементи, слухачі, таймери й WebGL-контексти (безпечно для StrictMode)
    // options навмисно не в залежностях: модуль ініціалізується один раз
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
