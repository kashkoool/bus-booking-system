import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaBus } from 'react-icons/fa';

import axios from "axios";
import {
  ChevronDownIcon,
  ClockIcon,
  MapPinIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/20/solid";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import Footer from "../components/Footer";

const Home = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0"); // Month is 0-indexed
    const day = String(today.getDate()).padStart(2, "0");
    const currentDate = `${year}-${month}-${day}`;
    return {
      origin: "",
      destination: "",
      date: currentDate,
      tripType: "one-way", // 'one-way' or 'round-trip'
    };
  });
  const [filters, setFilters] = useState({
    minPrice: 0,
    maxPrice: 100000, // Changed from 200000 to 100000
    timeOfDay: [], // e.g., ['morning', 'afternoon', 'evening']
    companies: [], // Array of company IDs
  });
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sliderValue, setSliderValue] = useState(filters.maxPrice);
  const debounceTimer = useRef(null);
  const [availableCompanies, setAvailableCompanies] = useState([]);

  // Fetch available companies on component mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5001/api/user/companies/active"
        );
        if (response.data.success) {
          // Ensure company IDs are numbers
          const companiesWithNumericIds = response.data.data.map((company) => ({
            ...company,
            companyID: Number(company.companyID),
          }));
          setAvailableCompanies(companiesWithNumericIds);
        }
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
    };
    fetchCompanies();
  }, []);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        origin: searchParams.origin || undefined,
        destination: searchParams.destination || undefined,
        date: searchParams.date || undefined
      };

      // Only add minPrice if changed from default (0)
      if (filters.minPrice !== 0) {
        params.minPrice = filters.minPrice;
      }
      // Only add maxPrice if changed from default (100000)
      if (filters.maxPrice !== 100000) {
        params.maxPrice = filters.maxPrice;
      }

      // Initialize time range variables
      let departureTimeFrom = null;
      let departureTimeTo = null;

      // Map timeOfDay filters to departureTimeFrom/departureTimeTo only if set
      if (filters.timeOfDay.length > 0) {
        if (filters.timeOfDay.includes("morning")) {
          departureTimeFrom = departureTimeFrom 
            ? Math.min(departureTimeFrom, "00:00") 
            : "00:00";
          departureTimeTo = departureTimeTo 
            ? Math.max(departureTimeTo, "10:00") 
            : "10:00";
        }
        if (filters.timeOfDay.includes("afternoon")) {
          departureTimeFrom = departureTimeFrom 
            ? Math.min(departureTimeFrom, "10:01") 
            : "10:01";
          departureTimeTo = departureTimeTo 
            ? Math.max(departureTimeTo, "17:00") 
            : "17:00";
        }
        if (filters.timeOfDay.includes("evening")) {
          departureTimeFrom = departureTimeFrom 
            ? Math.min(departureTimeFrom, "17:01") 
            : "17:01";
          departureTimeTo = departureTimeTo 
            ? Math.max(departureTimeTo, "23:59") 
            : "23:59";
        }

        // Only add time parameters if we have valid time range
        if (departureTimeFrom && departureTimeTo) {
          params.departureTimeFrom = departureTimeFrom;
          params.departureTimeTo = departureTimeTo;
        }
      }

      // Filter by companies only if set
      if (filters.companies.length > 0) {
        console.log("Sending company filter:", {
          companies: filters.companies,
          companiesString: filters.companies.join(","),
        });
        params.companies = filters.companies.join(",");
      }

      console.log("Fetching trips with params:", params);

      // Use public endpoint if not logged in, dashboard if logged in
      const endpoint = user
        ? "http://localhost:5001/api/user/dashboard"
        : "http://localhost:5001/api/user/trips/public";

      const response = await axios.get(endpoint, {
        params,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(user && {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          }),
        },
      });

      console.log("Trips response:", {
        success: response.data.success,
        count: response.data.data?.length,
        companies: response.data.data?.map((trip) => trip.company?.companyID),
      });

      // Both endpoints now return data in the same format
      if (response.data && response.data.data) {
        setTrips(response.data.data);
      } else {
        setTrips([]);
      }
    } catch (err) {
      console.error("Error fetching trips:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });

      let errorMessage = "Failed to fetch trips. Please try again.";

      if (err.response) {
        errorMessage = err.response.data?.message || errorMessage;
      } else if (err.request) {
        errorMessage =
          "Unable to connect to the server. Please check your internet connection.";
      }

      setError(errorMessage);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [searchParams, filters, user]);

  useEffect(() => {
    // Fetch trips regardless of authentication status
    fetchTrips();
  }, [fetchTrips]);

  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    console.log("Filter change event:", { name, value, type, checked });

    if (type === "checkbox") {
      if (name === "companies") {
        const numericValue = Number(value);
        console.log("Company filter change:", {
          value,
          numericValue,
          checked,
          currentCompanies: filters.companies,
        });

        setFilters((prev) => {
          const newCompanies = checked
            ? [...prev.companies, numericValue]
            : prev.companies.filter((id) => id !== numericValue);
          console.log("Updated companies filter:", newCompanies);
          return {
            ...prev,
            companies: newCompanies,
          };
        });
      } else {
        setFilters((prev) => ({
          ...prev,
          [name]: checked
            ? [...prev[name], value]
            : prev[name].filter((item) => item !== value),
        }));
      }
    } else {
      setFilters((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleTimeOfDayChange = (value) => {
    setFilters((prev) => {
      const newTimeOfDay = prev.timeOfDay.includes(value)
        ? prev.timeOfDay.filter((item) => item !== value)
        : [...prev.timeOfDay, value];
      return { ...prev, timeOfDay: newTimeOfDay };
    });
  };

  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value);
    setSliderValue(value); // Update the visual slider position immediately

    // Clear any existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set a new timer to update the actual filter after 500ms of no changes
    debounceTimer.current = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        maxPrice: value,
      }));
    }, 500);
  };

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Add useEffect to trigger fetchTrips when filters change
  useEffect(() => {
    fetchTrips();
  }, [filters, fetchTrips]);

  // Add effect to log filter changes
  useEffect(() => {
    console.log("Filters changed:", filters);
  }, [filters]);

  // Add effect to log available companies
  useEffect(() => {
    console.log("Available companies:", availableCompanies);
  }, [availableCompanies]);

  // Helper function to get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "scheduled":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Helper function to get status text in Arabic
  const getStatusText = (status) => {
    switch (status) {
      case "scheduled":
        return "مجدول";
      case "in-progress":
        return "قيد التنفيذ";
      case "completed":
        return "مكتمل";
      case "cancelled":
        return "ملغي";
      default:
        return status;
    }
  };

  // Helper function to check if trip is bookable
  const isTripBookable = (trip) => {
    return trip.status === "scheduled" && trip.seatsAvailable > 0;
  };

  // Helper function to calculate duration
  const calculateDuration = (departureTime, arrivalTime) => {
    if (!departureTime || !arrivalTime) return "غير متوفر"; // Not available
    const parseTime = (timeStr) => {
      if (!timeStr) return { hours: 0, minutes: 0 }; // Defensive: handle undefined/null/empty
      const [time, period] = timeStr.split(" ");
      let [hours, minutes] = time.split(":").map(Number);

      if (period === "PM" && hours !== 12) {
        hours += 12;
      } else if (period === "AM" && hours === 12) {
        hours = 0; // Midnight 12 AM is 00:00
      }
      return { hours, minutes };
    };

    const dep = parseTime(departureTime);
    const arr = parseTime(arrivalTime);

    let totalMinutes =
      arr.hours * 60 + arr.minutes - (dep.hours * 60 + dep.minutes);

    // If arrival is on the next day (e.g., departure 10 PM, arrival 6 AM)
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60; // Add 24 hours in minutes
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${minutes}m`;
    }
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="bg-gray-100 min-h-screen font-sans flex flex-col">
      <Header />

      {/* Hero Banner Section with Search Bar */}
      <div className="relative w-11/12 lg:w-4/5 mx-auto mt-8 rounded-xl shadow-lg z-10">
        <img
          src="/images/HomeImage.png"
          alt="حافلة - صورة رئيسية"
          className="w-full h-72 md:h-96 object-cover object-center"
        />
        <div className="absolute bottom-1 transform translate-y-1/4 left-0 w-full h-10% px-8">
          <div className="bg-white shadow-lg rounded-lg mt-0 mx-auto relative z-20 p-6 w-full">
            <div className="grid grid-cols-5 md:grid-cols-5 gap-4 w-full">
              {/* Origin Field */}
              <div className="flex flex-col  w-full">
                <label
                  htmlFor="origin"
                  className="block text-right text-gray-700 text-sm font-medium mb-1 rtl:font-sans"
                >
                  من
                </label>
                <div className="relative">
                  <MapPinIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 rtl:right-2 rtl:left-auto" />

                  <select
                    id="origin"
                    name="origin"
                    className="input-field text-right pr-8 rtl:pl-8 rtl:pr-3"
                    value={searchParams.origin}
                    onChange={handleSearchChange}
                  >
                    <option value="">من</option>
                    <option value="دمشق">دمشق</option>
                    <option value="حمص">حمص</option>
                    <option value="حماه">حماه</option>
                    <option value="طرطوس">طرطوس</option>
                    <option value="اللاذقية">اللاذقية</option>
                    <option value="دير الزور">دير الزور</option>
                    <option value="الحسكة">الحسكة</option>
                    <option value="حلب">حلب</option>
                  </select>
                </div>
              </div>

              {/* Destination Field */}
              <div className="flex flex-col w-full">
                <label
                  htmlFor="destination"
                  className="block text-right text-gray-700 text-sm font-medium mb-1 rtl:font-sans"
                >
                  إلى
                </label>
                <div className="relative">
                  <select
                    id="destination"
                    name="destination"
                    className="input-field text-right pr-8 rtl:pl-8 rtl:pr-3"
                    value={searchParams.destination}
                    onChange={handleSearchChange}
                  >
                    <option value="">إلى</option>
                    <option value="دمشق">دمشق</option>
                    <option value="حمص">حمص</option>
                    <option value="حماه">حماه</option>
                    <option value="طرطوس">طرطوس</option>
                    <option value="اللاذقية">اللاذقية</option>
                    <option value="دير الزور">دير الزور</option>
                    <option value="الحسكة">الحسكة</option>
                    <option value="حلب">حلب</option>
                  </select>
                  <MapPinIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 rtl:right-2 rtl:left-auto" />
                </div>
              </div>

              {/* Trip Type Field */}
              <div className="flex flex-col w-full">
                <label
                  htmlFor="tripType"
                  className="block text-right text-gray-700 text-sm font-medium mb-1 rtl:font-sans"
                >
                  نوع الرحلة
                </label>
                <div className="relative">
                  <select
                    id="tripType"
                    name="tripType"
                    className="input-field text-right rtl:text-right pr-8 rtl:pl-8 rtl:pr-3 appearance-none"
                    value={searchParams.tripType}
                    onChange={handleSearchChange}
                  >
                    <option value="one-way">ذهاب فقط</option>
                    {/* <option value="round-trip">ذهاب وإياب</option> */}
                  </select>
                  <ChevronDownIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 rtl:right-2 rtl:left-auto" />
                </div>
              </div>

              {/* Date Field */}
              <div className="flex flex-col w-full">
                <label
                  htmlFor="date"
                  className="block text-right text-gray-700 text-sm font-medium mb-1 rtl:font-sans"
                >
                  التاريخ
                </label>
                <div className="relative">
                  <input
                    id="date"
                    name="date"
                    type="date"
                    className="input-field text-right rtl:text-right pr-8 rtl:pl-8 rtl:pr-3 "
                    value={searchParams.date}
                    onChange={handleSearchChange}
                  />
                </div>
              </div>

              {/* Search Button */}
              <button
                onClick={fetchTrips}
                className="btn-primary py-3 px-6 rounded-lg flex items-center justify-center w-full"
                disabled={loading}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <MagnifyingGlassIcon className="w-5 h-5 ml-2 rtl:ml-0 rtl:mr-2" />
                )}
                بحث
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full px-0 py-8 flex flex-col mt-10 lg:flex-row-reverse gap-8">
        {/* Filter Sidebar (Right Column) */}
        <div className="w-full max-w-[378px] bg-white p-6 rounded-2xl shadow-lg order-2 lg:order-2 rtl:order-1 rtl:lg:order-1 h-fit lg:sticky lg:top-8 transition-all duration-300 hover:shadow-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <h3 className="text-xl font-bold text-right rtl:text-right text-gray-800">
              فلتر النتائج
            </h3>
            <button 
              onClick={() => {
                setFilters({
                  minPrice: 0,
                  maxPrice: 100000,
                  timeOfDay: [],
                  companies: []
                });
                setSliderValue(100000);
              }}
              className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
            >
              مسح الكل
            </button>
          </div>

          {/* Price Range Filter */}
          <div className="mb-6">
            <label
              htmlFor="price-range"
              className="block text-right rtl:text-right text-gray-700 font-medium mb-2"
            >
              نطاق السعر
            </label>
            <div className="flex items-center justify-between text-gray-600 text-sm mb-2 rtl:flex-row-reverse">
              <span>20000 ل.س</span>
              <span>{sliderValue} ل.س</span>
            </div>
            <input
              type="range"
              id="price-range"
              name="maxPrice"
              min="20000"
              max="100000"
              step="1000"
              value={sliderValue}
              onChange={handleSliderChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-lg accent-primary-600"
            />
          </div>

          {/* Time of Day Filter */}
          <div className="mb-6">
            <h4 className="text-right rtl:text-right text-gray-700 font-medium mb-3">
              وقت الرحلة
            </h4>
            <div className="grid grid-cols-2 gap-3 rtl:grid-cols-2">
              <button
                onClick={() => handleTimeOfDayChange("morning")}
                className={`flex items-center justify-center p-3 rounded-lg border text-sm transition-all
            ${
              filters.timeOfDay.includes("morning")
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
            }
          `}
              >
                <ClockIcon className="w-5 h-5 ml-2 rtl:ml-0 rtl:mr-2" />
                قبل 10 AM
              </button>
              <button
                onClick={() => handleTimeOfDayChange("afternoon")}
                className={`flex items-center justify-center p-3 rounded-lg border text-sm transition-all
            ${
              filters.timeOfDay.includes("afternoon")
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
            }
          `}
              >
                <ClockIcon className="w-5 h-5 ml-2 rtl:ml-0 rtl:mr-2" />
                10 AM - 05 PM
              </button>
              <button
                onClick={() => handleTimeOfDayChange("evening")}
                className={`flex items-center justify-center p-3 rounded-lg border text-sm transition-all
            ${
              filters.timeOfDay.includes("evening")
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
            }
          `}
              >
                <ClockIcon className="w-5 h-5 ml-2 rtl:ml-0 rtl:mr-2" />
                بعد 05 PM - 11 PM
              </button>
            </div>
          </div>

          {/* Company Filter */}
          <div>
            <h4 className="text-right rtl:text-right text-gray-700 font-medium mb-3">
              الشركة
            </h4>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {availableCompanies.map((company) => {
                const isChecked = filters.companies.includes(company.companyID);
                return (
                  <div
                    key={company.companyID}
                    className={`flex items-center p-2 rounded-lg transition-colors ${isChecked ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
                  >
                    <input
                      type="checkbox"
                      id={`company-${company.companyID}`}
                      name="companies"
                      value={company.companyID}
                      checked={isChecked}
                      onChange={handleFilterChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded ml-2 rtl:ml-0 rtl:mr-2 transition-colors"
                    />
                    <label
                      htmlFor={`company-${company.companyID}`}
                      className="text-sm text-gray-700 cursor-pointer text-right flex-1"
                    >
                      {company.companyName}
                    </label>
                    {company.logo && (
                      <img
                        src={`http://localhost:5001${company.logo}`}
                        alt={company.companyName}
                        className="w-6 h-6 rounded-full object-cover ml-2"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Trip Listings (Left Column) */}
        <div className="lg:w-3/4 order-1 lg:order-1 rtl:order-2 rtl:lg:order-2">
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 p-4 bg-red-100 rounded-md">
              {error}
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center text-gray-500 p-4 bg-white rounded-md shadow-sm">
              لا توجد رحلات مطابقة لمعايير البحث الخاصة بك.
            </div>
          ) : (
            <div className="space-y-4">
              {trips
                .filter(trip => {
                  // First check if trip is scheduled
                  if (trip.status !== 'scheduled') return false;
                  
                  // If date is selected, show all scheduled trips for that date
                  if (searchParams.date) {
                    return true;
                  }
                  
                  // If no date selected, only show future trips
                  const [hours, minutes] = trip.departureTime.split(':').map(Number);
                  const tripDateTime = new Date(trip.departureDate);
                  tripDateTime.setHours(hours, minutes, 0, 0);
                  
                  // Show trip if it's in the future
                  return tripDateTime > new Date();
                })
                .map((trip) => (
                <div
                  key={trip.id}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-6 items-center transition-all duration-300 hover:shadow-md hover:border-primary-100 transform hover:-translate-y-0.5"
                  dir="rtl"
                >
                  {/* Price and Book Button (Right Section - Visual RTL Leftmost) */}
                  <div className="order-3 rtl:order-1 flex flex-col items-start rtl:items-end border-r border-gray-100 pr-6 rtl:pr-0 rtl:pl-6 rtl:border-l rtl:border-r-0">
                    <p className="text-sm text-gray-500 mb-1 rtl:font-sans">
                      سعر التذكرة
                    </p>
                    <p className="text-2xl font-bold text-primary-600 mb-4 rtl:font-sans bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
                      {trip.cost?.toLocaleString()} <span className="text-base text-gray-500">ل.س</span>
                    </p>
                    <button
                      className="btn-primary py-2.5 px-6 rounded-lg text-sm rtl:font-sans font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                      }}
                      onClick={() => {
                        if (user) {
                          navigate("/booking", { state: { trip } });
                        } else {
                          navigate("/login");
                        }
                      }}
                    >
                      احجز الآن
                    </button>
                  </div>

                  {/* Trip Details (Middle Section) */}
                  <div className="order-2 rtl:order-2 flex flex-col flex-1 items-end text-right rtl:text-right">
                    {/* Date and Company Name */}
                    <div className="flex items-center text-gray-500 text-sm mb-3 rtl:flex-row-reverse bg-gray-50 px-3 py-1.5 rounded-full w-fit">
                      <span>
                        {new Date(trip.departureDate).toLocaleDateString(
                          "ar-SY",
                          {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          }
                        )}
                      </span>
                      <img
                        src="/images/Icon1.png"
                        alt="Calendar"
                        className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0"
                      />
                    </div>
                    <p className="text-lg font-semibold text-gray-800 rtl:font-sans mb-4">
                      {trip.company?.companyName || "الشركة غير معروفة"}
                    </p>

                    {/* Origin - Bus - Destination with line */}
                    <div className="flex items-center justify-between w-full relative px-2">
                      <div className="text-center flex flex-col items-end">
                        <p className="text-xl font-bold text-blue-700 rtl:font-sans">
                          {trip.origin}
                        </p>
                        <p className="text-sm text-gray-600">
                          {trip.departureTime}
                        </p>
                      </div>

                      {/* Middle section with line and bus */}
                      <div className="flex-1 flex items-center justify-center relative h-10">
                        <div className="absolute w-full h-px border-t border-dashed border-gray-300"></div>
                        <FaBus className="text-blue-700" />
                        {/* Left Arrow */}
                        <div className="absolute left-0 top-1/2 w-2 h-2 border-l border-b border-gray-400 transform -translate-y-1/2 rotate-45 z-10 -ml-1"></div>
                        {/* Right Arrow */}
                        <div className="absolute right-0 top-1/2 w-2 h-2 border-r border-b border-gray-400 transform -translate-y-1/2 -rotate-45 z-10 -mr-1"></div>
                      </div>

                      <div className="text-center flex flex-col items-start">
                        <p className="text-xl font-bold text-blue-700 rtl:font-sans">
                          {trip.destination}
                        </p>
                        <p className="text-sm text-gray-600">
                          {trip.arrivalTime}
                        </p>
                      </div>
                    </div>
                    {/* Duration and Seats */}
                    <div className="flex items-center justify-between mt-4 text-sm">
                      <div className="flex items-center text-gray-500">
                        <ClockIcon className="w-4 h-4 ml-1 text-gray-400" />
                        <span>وقت الرحلة: {calculateDuration(trip.departureTime, trip.arrivalTime)}</span>
                      </div>
                      <div className={`flex items-center ${trip.seatsAvailable > 10 ? 'text-green-600' : trip.seatsAvailable > 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{trip.seatsAvailable} مقاعد متبقية</span>
                      </div>
                    </div>
                  </div>

                  {/* Company Logo (Left Section - Visual RTL Rightmost) */}
                  <div className="order-1 rtl:order-3 flex flex-col items-center justify-center bg-gray-50 p-3 rounded-xl w-20 h-20 md:w-24 md:h-24 transition-all duration-300 hover:bg-primary-50">
                    <img
                      src={           
                        trip.company?.logo ? `http://localhost:5001${trip.company.logo}` : "/images/tarwada.png"
                      }
                      alt={trip.company?.companyName || "Company Logo"}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.src = "/images/tarwada.png";
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Home;
