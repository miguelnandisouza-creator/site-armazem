"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import { useState } from "react";

export function ProductImage({ src, alt, sizes, className = "" }: {
  src?: string | null;
  alt: string;
  sizes: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(src && failedSrc === src);

  if (!src || failed) {
    return <div className="grid h-full w-full place-items-center bg-[#eeeae0] text-center">
      <div><Package size={34} className="mx-auto text-black/30" /><p className="mt-2 px-3 text-[10px] font-black uppercase text-black/40">Imagem em breve</p></div>
    </div>;
  }

  return <Image
    src={src}
    alt={alt}
    fill
    unoptimized
    sizes={sizes}
    onError={() => setFailedSrc(src || null)}
    className={`object-contain mix-blend-multiply ${className}`}
  />;
}
