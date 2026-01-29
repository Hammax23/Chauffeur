"use client";
import { Mail, Calendar, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const HeroSection = () => {
  // Initial date with no time selected
  const getInitialDate = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  };
  
  const [selectedDate, setSelectedDate] = useState<Date>(getInitialDate());
  const [isTimeSelected, setIsTimeSelected] = useState(false);
  
  // Listen for time selection clicks
  useEffect(() => {
    const handleTimeClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.react-datepicker__time-list-item')) {
        setIsTimeSelected(true);
      }
    };
    
    document.addEventListener('click', handleTimeClick);
    return () => document.removeEventListener('click', handleTimeClick);
  }, []);
  
  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/cover.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative z-10 flex flex-col min-h-screen pt-[130px] sm:pt-[145px]">
        <div className="max-w-[1600px] mx-auto w-full px-8">
          <div className="text-left mb-4 sm:mb-6 md:mb-8 mt-32 sm:mt-40 md:mt-48 lg:mt-56 max-w-[800px] lg:ml-[180px]">
          <p className="text-white/90 text-sm sm:text-base md:text-lg mb-3 sm:mb-4 font-normal tracking-wide">
            Where Would You Like To Go?
          </p>
          <h1 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-medium leading-tight">
            Your Personal
            <br />
            Chauffeur Services
          </h1>
          </div>
        </div>

        <div id="book" className="w-full max-w-[1300px] mt-4 sm:mt-6 md:mt-8 lg:mt-10 mb-12 sm:mb-16 md:mb-20 lg:mb-24 mx-auto px-4 sm:px-6 md:px-8">
          <div className="bg-white rounded-3xl md:rounded-full shadow-2xl px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-5 lg:px-10 lg:py-5">
            <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap lg:items-center lg:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-[200px]">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" strokeWidth={1.5} />
                <div className="flex flex-col flex-1">
                  <span className="text-[12px] sm:text-[13px] md:text-[14px] font-semibold text-gray-900 mb-0.5 sm:mb-1">Mailid</span>
                  <input
                    type="email"
                    placeholder="example@gmail.com"
                    className="text-[13px] sm:text-[14px] md:text-[15px] text-gray-600 outline-none bg-transparent w-full"
                  />
                </div>
              </div>

              <div className="hidden md:block w-px h-10 md:h-12 bg-gray-300"></div>
              <div className="md:hidden h-px w-full bg-gray-200"></div>

              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-[200px] datepicker-container">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" strokeWidth={1.5} />
                <div className="flex flex-col flex-1">
                  <span className="text-[12px] sm:text-[13px] md:text-[14px] font-semibold text-gray-900 mb-0.5 sm:mb-1">Date</span>
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date: Date | null) => setSelectedDate(date as Date)}
                    showTimeSelect
                    timeFormat="h:mm aa"
                    timeIntervals={15}
                    timeCaption="Time"
                    dateFormat={isTimeSelected ? "MMMM d, yyyy h:mm aa" : "MMMM d, yyyy"}
                    className="text-[13px] sm:text-[14px] md:text-[15px] text-gray-600 outline-none bg-transparent w-full cursor-pointer transition-all duration-200 hover:text-gray-900"
                    calendarClassName="hero-datepicker"
                    minDate={new Date()}
                    shouldCloseOnSelect={false}
                  />
                </div>
              </div>

              <div className="hidden md:block w-px h-10 md:h-12 bg-gray-300"></div>
              <div className="md:hidden h-px w-full bg-gray-200"></div>

              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-[200px]">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" strokeWidth={1.5} />
                <div className="flex flex-col flex-1">
                  <span className="text-[12px] sm:text-[13px] md:text-[14px] font-semibold text-gray-900 mb-0.5 sm:mb-1">Pickup Location</span>
                  <input
                    type="text"
                    defaultValue="London City Airport"
                    className="text-[13px] sm:text-[14px] md:text-[15px] text-gray-600 outline-none bg-transparent w-full"
                  />
                </div>
              </div>

              <div className="hidden md:block w-px h-10 md:h-12 bg-gray-300"></div>
              <div className="md:hidden h-px w-full bg-gray-200"></div>

              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-[200px]">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" strokeWidth={1.5} />
                <div className="flex flex-col flex-1">
                  <span className="text-[12px] sm:text-[13px] md:text-[14px] font-semibold text-gray-900 mb-0.5 sm:mb-1">Drop Location</span>
                  <input
                    type="text"
                    defaultValue="London City Blackheath"
                    className="text-[13px] sm:text-[14px] md:text-[15px] text-gray-600 outline-none bg-transparent w-full"
                  />
                </div>
              </div>

              <button className="bg-gradient-to-r from-black via-gray-900 to-black text-white px-6 py-3 sm:px-8 sm:py-3.5 md:px-10 md:py-3.5 lg:px-12 lg:py-4 rounded-full text-[13px] sm:text-[14px] md:text-[15px] font-semibold hover:from-gray-900 hover:via-black hover:to-gray-900 hover:scale-105 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 w-full md:w-auto md:flex-shrink-0 mt-3 md:mt-0 min-w-[100px] backdrop-blur-sm border border-white/10">
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
