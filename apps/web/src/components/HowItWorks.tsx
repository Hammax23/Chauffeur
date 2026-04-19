"use client";

const HowItWorks = () => {
  const steps = [
    {
      number: "STEP 1",
      title: "Choose Your Car",
      description: (
        <>
          Browse our hand-selected fleet of <span className="text-[#C9A063]">luxury</span> sedans, SUVs, and sports cars to find the perfect match for your moment.
        </>
      ),
    },
    {
      number: "STEP 2",
      title: "Select Date & Service",
      description: "Choose your preferred schedule and service—hourly rental, airport transfer, chauffeur ride, or special event.",
    },
    {
      number: "STEP 3",
      title: "Confirm & Personalize",
      description: "Complete your booking with transparent pricing and add any custom requests such as routes, decorations, or VIP pick-up.",
    },
    {
      number: "STEP 4",
      title: "Enjoy Your Premium Ride",
      description: "Your chauffeur arrives on time with a perfectly prepared vehicle, ensuring a smooth, elegant, and memorable journey.",
    },
  ];

  return (
    <section className="relative py-16 sm:py-20 md:py-24 lg:py-32 bg-[#0a0a0a] overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 md:px-12">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/30 mb-6 sm:mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
            <span className="text-white text-[12px] sm:text-[13px] font-normal tracking-widest uppercase">HOW IT WORKS</span>
          </div>
          
          <h2 className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
            A Premium Ride in Just a<br />Few Steps
          </h2>
          
          <p className="text-gray-400 text-[14px] sm:text-[15px] md:text-[16px] max-w-[700px] mx-auto leading-relaxed">
            Our process is crafted to offer a smooth, stress-free experience from the moment you book.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Side - Video */}
          <div className="relative order-2 lg:order-1">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto"
            >
              <source src="/howitswork.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Right Side - Steps with Vertical Line */}
          <div className="relative order-1 lg:order-2">
            {/* Vertical Line - Full Height */}
            <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/30 hidden lg:block"></div>
            
            <div className="space-y-8 sm:space-y-10 lg:pl-10">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  {/* Content */}
                  <div>
                    {/* Step Number */}
                    <div className="text-gray-500 text-[11px] sm:text-[12px] font-medium tracking-wider mb-2">
                      {step.number}
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-white text-lg sm:text-xl font-bold mb-2 leading-tight">
                      {step.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-gray-400 text-[13px] sm:text-[14px] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reserve Now Button */}
        <div className="text-center mt-12 sm:mt-16 md:mt-20">
          <button className="group relative px-8 sm:px-10 py-3 sm:py-4 bg-white text-black text-[14px] sm:text-[15px] font-semibold rounded-lg hover:bg-gray-50 transition-all duration-300 hover:scale-105 shadow-[0_8px_30px_rgba(255,255,255,0.15)] hover:shadow-[0_12px_40px_rgba(255,255,255,0.25)] backdrop-blur-sm border border-white/20 overflow-hidden">
            {/* iOS Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 group-hover:animate-shimmer"></div>
            <span className="relative z-10">Reserve Now</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
