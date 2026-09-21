/* eslint-disable @next/next/no-img-element -- imagens do Storage já são redimensionadas no upload; sem otimizador */
export function RemoteImage({
  src,
  alt = "",
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  return <img src={src} alt={alt} loading="lazy" className={className} />;
}
