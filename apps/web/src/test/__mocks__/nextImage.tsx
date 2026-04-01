import type { ImageProps } from "next/image";
import { forwardRef } from "react";

const Image = forwardRef<HTMLImageElement, ImageProps>(
  ({ src, alt, width, height, className, onError, ...props }, ref) => {
    return (
      <img
        ref={ref}
        src={typeof src === "string" ? src : (src as { src: string }).src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onError={onError}
        {...props}
      />
    );
  },
);

Image.displayName = "Image";

export default Image;
