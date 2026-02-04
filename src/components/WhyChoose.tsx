"use client";

const WhyChoose = () => {
  const features = [
    {
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
      ),
      title: 'Luxury Fleet',
      description: 'Enjoy a hand-selected collection of premium cars, maintained to perfection and ready for every occasion.',
    },
    {
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      ),
      title: 'Professional Chauffeurs',
      description: 'Travel with chauffeurs trained in hospitality, discretion, and world-class service standards.',
    },
    {
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
      ),
      title: 'Fair Pricing',
      description: 'Luxury service without hidden surprises—clear rates and full visibility from the start.',
    },
    {
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: '24/7 Support',
      description: 'Your dedicated support team is always ready to assist with bookings, changes, or special arrangements.',
    },
    {
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
      title: 'Safety & Security',
      description: 'Every vehicle and ride is protected under comprehensive insurance for absolute peace of mind.',
    },
    {
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'On-Time Guarantee',
      description: 'Timing is everything—our team ensures every pick-up and drop-off happens exactly when needed.',
    },
  ];

  return (
    <section className="py-10 sm:py-12 md:py-14 lg:py-16 bg-[#0a0a0a] relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 md:px-12 relative z-10">
        {/* Header Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 mb-10 sm:mb-12 md:mb-14">
          {/* Left: Badge and Heading */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/30 mb-4 sm:mb-5">
              <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
              <span className="text-white text-[12px] sm:text-[13px] font-normal tracking-widest uppercase">WHY CHOOSE US</span>
            </div>
            
            <h5 className="text-gray-400 text-[25px] sm:text-[23px] font-normal leading-relaxed">
            SARJ Worldwide owned vehicles, range from Sedans, SUVs, Sprinters and Limousines. All vehicle are equipped with cell phone chargers, WIFI, & bottled water.
            </h5>
          </div>

          {/* Right: Description */}
          <div className="flex items-end lg:items-center">
            {/* <p className="text-gray-400 text-[15px] sm:text-[16px] leading-relaxed max-w-[500px]">
              Our commitment to excellence ensures a smooth, elegant, and worry-free experience from start to finish.
            </p> */}
          </div>
        </div>

        {/* Features Grid - 2 rows x 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10 sm:gap-y-12">
          {features.map((feature, index) => (
            <div key={index} className="group">
              {/* Icon */}
              <div className="mb-6 text-white">
                {feature.icon}
              </div>

              {/* Title */}
              <h3 className="text-white text-xl sm:text-2xl font-bold mb-3 leading-tight">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-gray-400 text-[14px] sm:text-[15px] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChoose;
