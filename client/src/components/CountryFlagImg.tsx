import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * PNG flags — works on Windows where emoji flags show as "PK", "US", etc.
 * flagcdn.com only allows widths 20, 40, 80, … — sizes like w22 return 404.
 */
export function CountryFlagImg({
  isoCode,
  name,
  width = 22,
  className,
}: {
  isoCode: string;
  name?: string;
  width?: number;
  className?: string;
}) {
  const code = isoCode.trim().toLowerCase();
  const [sourceIndex, setSourceIndex] = useState(0);

  if (!/^[a-z]{2}$/.test(code)) return null;

  const displayH = Math.round((width * 15) / 20);

  const sources = [
    `https://flagcdn.com/w40/${code}.png`,
    `https://flagpedia.net/data/flags/h80/${code}.png`,
  ];

  const src = sources[Math.min(sourceIndex, sources.length - 1)];

  return (
    <img
      src={src}
      width={width}
      height={displayH}
      alt=""
      title={name ? name : undefined}
      className={cn(
        'inline-block shrink-0 rounded-[2px] object-cover ring-1 ring-zinc-200 dark:ring-zinc-600 bg-zinc-100 dark:bg-zinc-800',
        className,
      )}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (sourceIndex < sources.length - 1) setSourceIndex((i) => i + 1);
      }}
    />
  );
}
