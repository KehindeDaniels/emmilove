import { useState } from "react";
import { useReveal } from "@/hooks/use-reveal";
import img1 from "@/assets/proposal-1.jpeg";
import img2 from "@/assets/proposal-2.jpeg";
import img3 from "@/assets/proposal-3.jpeg";
import img4 from "@/assets/proposal-4.jpeg";
import img5 from "@/assets/proposal-5.jpeg";
import img6 from "@/assets/proposal-6.jpeg";

const images = [
  { src: img4, span: "row-span-2", alt: "Day proposal — water view" },
  { src: img1, span: "", alt: "Night proposal — candlelight" },
  { src: img5, span: "", alt: "Bouquet of forever" },
  { src: img3, span: "row-span-2", alt: "On bended knee" },
  { src: img2, span: "", alt: "Table for two" },
  { src: img6, span: "", alt: "Together at last" },
];

const Gallery = () => {
  const ref = useReveal();
  const [active, setActive] = useState<number | null>(null);

  return (
    <section id="gallery" ref={ref} className="scroll-mt-nav relative py-28 md:py-40 bg-background overflow-hidden">
      <div className="container relative">
        <div className="text-center mb-14 reveal">
          <p className="font-script text-3xl md:text-4xl text-gradient-gold mb-2">moments</p>
          <h2 className="font-serif-display text-4xl md:text-6xl">A Gallery of Us</h2>
          <div className="mx-auto mt-6 h-px w-24 bg-gradient-gold" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[180px] md:auto-rows-[240px] gap-3 md:gap-5 max-w-6xl mx-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`reveal group relative overflow-hidden rounded-2xl shadow-soft hover:shadow-romance transition-all duration-700 ${img.span}`}
            >
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.6s] group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute bottom-3 left-3 right-3 text-white text-xs tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-500 text-left">
                {img.alt}
              </div>
            </button>
          ))}
        </div>
      </div>

      {active !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in-soft"
          onClick={() => setActive(null)}
        >
          <button className="absolute top-6 right-6 text-white/80 hover:text-white text-3xl" aria-label="Close">×</button>
          <img src={images[active].src} alt={images[active].alt} className="max-h-[88vh] max-w-[92vw] object-contain rounded-2xl shadow-elegant" />
        </div>
      )}
    </section>
  );
};

export default Gallery;
