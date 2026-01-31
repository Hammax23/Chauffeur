"use client";

const LuxuryRide = () => {
  return (
    <section className="relative w-full h-[500px] sm:h-[600px] md:h-[700px] overflow-hidden">
      {/* Background Image/Video */}
      <div className="absolute inset-0">
        <img
          src="/cover1.jpeg"
          alt="Luxury Car"
          className="w-full h-full object-cover"
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 sm:px-8 md:px-12 text-center">
        {/* Main Heading */}
        <h1 className="text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
          Elevate Your Next Journey<br />
          with a Luxury Ride
        </h1>

        {/* Subtitle/Description */}
        <p className="text-white/90 text-[15px] sm:text-[16px] md:text-[17px] max-w-3xl leading-relaxed mb-8 font-light">
          Enjoy seamless booking, professional chauffeurs, and a premium fleet curated for<br className="hidden sm:block" />
          comfort, moments, and milestones.
        </p>

        {/* CTA Button */}
        <button className="group relative px-8 py-3.5 bg-white text-black text-[15px] sm:text-[16px] font-semibold rounded-lg hover:bg-gray-100 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl">
          Start Reservation
        </button>
      </div>
    </section>
  );
};

export default LuxuryRide;
