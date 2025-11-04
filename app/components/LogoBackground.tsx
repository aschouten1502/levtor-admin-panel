'use client';

export const LogoBackground = () => {
  // Create array of 90 logos for beautiful background pattern (increased from 56)
  const logoCount = 90;
  const logos = Array.from({ length: logoCount }, (_, i) => i);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Warme gradient achtergrond */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-yellow-50" />

      {/* Logo pattern - More visible and more frequent */}
      <div className="absolute inset-0 grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10
                      gap-4 sm:gap-6 md:gap-8 lg:gap-10
                      p-4 sm:p-6 md:p-8 lg:p-10
                      place-items-center">
        {logos.map((i) => (
          <div
            key={i}
            className="flex items-center justify-center"
          >
            <img
              src="/Afbeeldingen/Geosticklogo.png"
              alt=""
              className="w-12 sm:w-14 md:w-16 lg:w-20 h-auto select-none"
              style={{
                opacity: 0.08,
                filter: "grayscale(50%) brightness(1.2)",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
