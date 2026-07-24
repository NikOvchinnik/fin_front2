// icons.svg живе в public/ і не хешується Vite при білді, тому CDN (Cloudflare
// перед DigitalOcean) може роздавати застарілу закешовану версію файлу навіть
// після деплою. Версійний параметр у URL змушує CDN трактувати кожну зміну
// файлу як новий ресурс. Піднімай це число щоразу, коли редагуєш icons.svg.
const ICONS_VERSION = 2;

const Icon = ({ id, width, height, className = '' }) => {
  return (
    <svg
      className={`${className}`}
      style={{ background: 'transparent' }}
      width={width}
      height={height}
      aria-hidden="true"
    >
      <use href={`/icons/icons.svg?v=${ICONS_VERSION}#icon-${id}`}></use>
    </svg>
  );
};

export default Icon;
