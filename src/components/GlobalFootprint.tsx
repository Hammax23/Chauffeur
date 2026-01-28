"use client";

const GlobalFootprint = () => {
  const cities = [
    { name: "New York", left: "22%", top: "28%" },
    { name: "Los Angeles", left: "12%", top: "35%" },
    { name: "Toronto", left: "24%", top: "25%" },
    { name: "London", left: "48%", top: "22%" },
    { name: "Paris", left: "50%", top: "25%" },
    { name: "Dubai", left: "62%", top: "35%" },
    { name: "Tokyo", left: "82%", top: "30%" },
    { name: "Singapore", left: "75%", top: "48%" },
    { name: "Sydney", left: "88%", top: "62%" },
    { name: "Mumbai", left: "68%", top: "38%" },
  ];

  return (
    <section className="relative py-12 sm:py-14 md:py-16 lg:py-18 bg-white overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C9A063]/2 via-transparent to-[#C9A063]/1"></div>
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-radial from-[#C9A063]/2 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-[#C9A063]/2 to-transparent rounded-full blur-3xl"></div>
        {/* Decorative lines */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#C9A063]/10 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#C9A063]/10 to-transparent"></div>
      </div>

      <div className="max-w-[1800px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-7 md:mb-8">
          <div className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white backdrop-blur-xl border border-[#C9A063]/30 shadow-xl shadow-[#C9A063]/10 mb-6 sm:mb-8 hover:shadow-2xl hover:shadow-[#C9A063]/20 transition-all duration-300">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#C9A063] to-[#B8935A] animate-pulse shadow-lg shadow-[#C9A063]/50"></div>
            <span className="text-gray-800 text-[13px] sm:text-[14px] font-bold tracking-[0.2em] uppercase">GLOBAL FOOTPRINT</span>
          </div>
          
          <h2 className="text-gray-800 text-2xl sm:text-3xl md:text-4xl font-bold mb-4 tracking-tight">
            Worldwide Excellence
          </h2>
          <p className="text-gray-600 text-[15px] sm:text-[16px] md:text-[17px] tracking-wide font-light max-w-3xl mx-auto leading-relaxed">
            There's a reason for our elevated reputation worldwide. Experience luxury chauffeur services across major cities globally.
          </p>
        </div>

        {/* World Map Container with iOS Effects */}
        <div className="relative w-full h-[500px] sm:h-[600px] md:h-[700px] lg:h-[750px] max-w-[1600px] mx-auto">
          {/* Dotted world map pattern */}
          <div 
            className="absolute inset-0 opacity-85"
            style={{
              backgroundImage: `
                radial-gradient(circle, rgba(30,30,30,0.8) 2.5px, transparent 2.5px),
                radial-gradient(circle, rgba(40,40,40,0.6) 1.5px, transparent 1.5px),
                radial-gradient(circle, rgba(50,50,50,0.18) 1px, transparent 1px),
                radial-gradient(circle, rgba(60,60,60,0.08) 0.8px, transparent 0.8px),
                radial-gradient(circle, rgba(70,70,70,0.03) 0.6px, transparent 0.6px)
              `,
              backgroundSize: '18px 18px, 11px 11px, 7px 7px, 4.5px 4.5px, 2.5px 2.5px',
              backgroundPosition: '0 0, 5.5px 5.5px, 3.5px 3.5px, 2.2px 2.2px, 1.2px 1.2px',
              maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 500'%3E%3Cpath fill='white' d='M80,120 L100,100 L150,110 L180,95 L200,110 L230,105 L250,120 L240,150 L220,160 L200,180 L180,190 L160,200 L140,180 L120,170 L90,160 L80,140 Z M300,80 L350,70 L400,85 L450,80 L480,95 L500,90 L530,105 L550,115 L540,140 L520,150 L500,170 L480,160 L460,140 L440,125 L420,110 L400,100 L380,95 L360,90 L340,95 L320,100 Z M180,220 L200,210 L220,220 L240,230 L250,250 L245,270 L235,290 L220,310 L200,320 L180,310 L170,290 L165,270 L170,250 L180,230 Z M600,100 L650,90 L700,95 L750,100 L800,95 L850,105 L880,120 L870,150 L850,165 L830,180 L810,190 L790,185 L770,175 L750,160 L730,145 L710,130 L690,115 L670,110 L650,110 L630,105 Z M820,220 L860,210 L900,220 L920,235 L910,260 L890,275 L870,270 L850,260 L830,245 Z M550,180 L590,170 L630,175 L670,185 L700,195 L720,210 L730,230 L720,260 L700,280 L680,295 L660,300 L640,295 L620,285 L600,270 L580,250 L565,230 L555,210 Z M600,320 L640,310 L680,320 L710,335 L730,355 L720,380 L700,395 L680,400 L660,395 L640,385 L620,370 L605,350 Z M850,350 L880,340 L910,350 L925,370 L920,390 L900,400 L880,395 L865,380 Z'/%3E%3C/svg%3E")`,
              WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 500'%3E%3Cpath fill='white' d='M80,120 L100,100 L150,110 L180,95 L200,110 L230,105 L250,120 L240,150 L220,160 L200,180 L180,190 L160,200 L140,180 L120,170 L90,160 L80,140 Z M300,80 L350,70 L400,85 L450,80 L480,95 L500,90 L530,105 L550,115 L540,140 L520,150 L500,170 L480,160 L460,140 L440,125 L420,110 L400,100 L380,95 L360,90 L340,95 L320,100 Z M180,220 L200,210 L220,220 L240,230 L250,250 L245,270 L235,290 L220,310 L200,320 L180,310 L170,290 L165,270 L170,250 L180,230 Z M600,100 L650,90 L700,95 L750,100 L800,95 L850,105 L880,120 L870,150 L850,165 L830,180 L810,190 L790,185 L770,175 L750,160 L730,145 L710,130 L690,115 L670,110 L650,110 L630,105 Z M820,220 L860,210 L900,220 L920,235 L910,260 L890,275 L870,270 L850,260 L830,245 Z M550,180 L590,170 L630,175 L670,185 L700,195 L720,210 L730,230 L720,260 L700,280 L680,295 L660,300 L640,295 L620,285 L600,270 L580,250 L565,230 L555,210 Z M600,320 L640,310 L680,320 L710,335 L730,355 L720,380 L700,395 L680,400 L660,395 L640,385 L620,370 L605,350 Z M850,350 L880,340 L910,350 L925,370 L920,390 L900,400 L880,395 L865,380 Z'/%3E%3C/svg%3E")`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center'
            }}
          />
          
          {/* City markers with iOS style */}
          <div className="absolute inset-0 z-20">
            {cities.map((city, i) => (
              <div
                key={i}
                className="absolute group cursor-pointer"
                style={{ left: city.left, top: city.top }}
              >
                {/* Pulsing dot - Made larger */}
                <div className="relative">
                  {/* Outer pulse ring */}
                  <div className="absolute -inset-6 bg-gradient-to-r from-[#C9A063] to-[#B8935A] rounded-full opacity-20 group-hover:opacity-40 transition-all duration-500 animate-ping"></div>
                  {/* Middle ring */}
                  <div className="absolute -inset-3 bg-[#C9A063]/30 rounded-full group-hover:bg-[#C9A063]/40 transition-all duration-300"></div>
                  {/* Main dot */}
                  <div className="relative w-6 h-6 bg-gradient-to-br from-[#C9A063] via-[#D4AF6A] to-[#B8935A] rounded-full shadow-2xl shadow-[#C9A063]/70 group-hover:scale-110 transition-all duration-300 border-[3px] border-white ring-2 ring-[#C9A063]/40 group-hover:ring-[#C9A063]/60">
                    {/* Inner glow */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 to-transparent"></div>
                  </div>
                </div>
                
                {/* City name - Simple stylish text */}
                <div className="absolute left-1/2 -translate-x-1/2 top-10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:-translate-y-1 z-30 pointer-events-none">
                  <span className="text-gray-900 text-[14px] sm:text-[15px] font-bold tracking-wider uppercase drop-shadow-[0_2px_8px_rgba(255,255,255,0.9)] [text-shadow:_0_1px_3px_rgb(255_255_255_/_80%)]">
                    {city.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Scattered diamond accents with glow */}
          <div className="absolute inset-0">
            {[
              { left: '18%', top: '32%' },
              { left: '28%', top: '48%' },
              { left: '42%', top: '27%' },
              { left: '54%', top: '42%' },
              { left: '72%', top: '36%' },
              { left: '85%', top: '55%' },
            ].map((pos, i) => (
              <div
                key={i}
                className="absolute"
                style={{ left: pos.left, top: pos.top }}
              >
                <div className="relative">
                  <div className="absolute -inset-2 bg-[#C9A063]/20 rounded-full blur-sm"></div>
                  <div className="relative w-3 h-3 bg-gradient-to-br from-[#C9A063] to-[#B8935A] opacity-60 rotate-45 shadow-xl shadow-[#C9A063]/60 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Connecting lines effect */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C9A063" stopOpacity="0" />
                <stop offset="50%" stopColor="#C9A063" stopOpacity="1" />
                <stop offset="100%" stopColor="#C9A063" stopOpacity="0" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <line x1="22%" y1="28%" x2="48%" y2="22%" stroke="url(#lineGradient)" strokeWidth="2.5" filter="url(#glow)" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite"/>
            </line>
            <line x1="48%" y1="22%" x2="62%" y2="35%" stroke="url(#lineGradient)" strokeWidth="2.5" filter="url(#glow)" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite"/>
            </line>
            <line x1="62%" y1="35%" x2="82%" y2="30%" stroke="url(#lineGradient)" strokeWidth="2.5" filter="url(#glow)" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite"/>
            </line>
          </svg>
        </div>
      </div>
    </section>
  );
};

export default GlobalFootprint;
