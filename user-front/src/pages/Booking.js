import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import { useSocket } from "../hooks/useSocket";
import RealTimeBooking from "../components/RealTimeBooking";

const Booking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const trip = location.state?.trip;
  const { joinTrip, leaveTrip } = useSocket();

  // Redirect if no trip data
  useEffect(() => {
    if (!trip) {
      navigate("/");
    } else {
      console.log('Trip data:', trip);
      console.log('Trip seats available:', trip.seatsAvailable);
    }
  }, [trip, navigate]);

  // Form state
  const [contact, setContact] = useState({
    email: user?.email || "",
    phone: user?.phone || "",
  });

  // Update contact info when user data changes
  useEffect(() => {
    if (user) {
      setContact({
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);
  const [noOfSeats, setNoOfSeats] = useState(1);
  const [passengers, setPassengers] = useState([
    { firstName: "", lastName: "", gender: "male", phone: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [availableSeats, setAvailableSeats] = useState([]);
  const [availableSeatsCount, setAvailableSeatsCount] = useState(0);
  const [loadingSeats, setLoadingSeats] = useState(true);
  const [creditCard, setCreditCard] = useState(null);
  const [loadingCard, setLoadingCard] = useState(true);

  // Fetch user's default credit card
  useEffect(() => {
    const fetchCreditCard = async () => {
      if (!user?._id) {
        return;
      }

      try {
        setLoadingCard(true);
        const token = localStorage.getItem("token");

        const response = await axios.get(
          "http://localhost:5001/api/user/credit-cards/default",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.success && response.data.data) {
          setCreditCard(response.data.data);
        } else {
          setCreditCard(null);
        }
      } catch (err) {
        if (err.response?.status !== 404) {
          setError("Failed to fetch credit card information");
        }
        setCreditCard(null);
      } finally {
        setLoadingCard(false);
      }
    };

    fetchCreditCard();
  }, [user?._id]); // Only depend on user._id

  // Join trip room for real-time updates
  useEffect(() => {
    if (trip?._id) {
      joinTrip(trip._id);
    }

    return () => {
      if (trip?._id) {
        leaveTrip(trip._id);
      }
    };
  }, [trip?._id, joinTrip, leaveTrip]); // Add joinTrip and leaveTrip to dependencies

  // Fetch available seats when component mounts
  useEffect(() => {
    const fetchAvailableSeats = async () => {
      if (!trip?._id) return;

      try {
        setLoadingSeats(true);
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `http://localhost:5001/api/user/trips/${trip._id}/available-seats`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setAvailableSeats(response.data.data.availableSeats);
        setAvailableSeatsCount(response.data.data.availableCount);
      } catch (err) {
        setError("Failed to fetch available seats");
      } finally {
        setLoadingSeats(false);
      }
    };

    fetchAvailableSeats();
  }, [trip?._id]); // Only depend on trip._id

  const handlePassengerChange = (index, e) => {
    const { name, value } = e.target;
    const updatedPassengers = [...passengers];
    updatedPassengers[index] = {
      ...updatedPassengers[index],
      [name]: value,
    };
    setPassengers(updatedPassengers);
  };

  const handleSeatsChange = (e) => {
    const newNoOfSeats = parseInt(e.target.value);
    setNoOfSeats(newNoOfSeats);

    // Update passengers array
    const currentLength = passengers.length;
    if (newNoOfSeats > currentLength) {
      // Add new passengers
      const newPassengers = Array(newNoOfSeats - currentLength)
        .fill()
        .map(() => ({
          firstName: "",
          lastName: "",
          gender: "male",
          phone: "",
        }));
      setPassengers([...passengers, ...newPassengers]);
    } else if (newNoOfSeats < currentLength) {
      // Remove extra passengers
      setPassengers(passengers.slice(0, newNoOfSeats));
    }
  };

  // Handle real-time seat updates
  const handleSeatsUpdate = (newSeatsAvailable) => {
    // Update the available seats count
    setAvailableSeatsCount(newSeatsAvailable);
    setAvailableSeats(prev => {
      // Recalculate available seats based on new count
      const totalSeats = trip?.seatsAvailable || 0;
      const takenSeats = totalSeats - newSeatsAvailable;
      
      // Generate new available seats array
      const newAvailableSeats = [];
      for (let i = 1; i <= totalSeats; i++) {
        if (i > takenSeats) {
          newAvailableSeats.push(i);
        }
      }
      
      return newAvailableSeats;
    });
  };

  const validateForm = () => {
    const errors = {};

    // Validate contact information
    if (!contact.email) errors["contact.email"] = "البريد الإلكتروني مطلوب";
    if (!contact.phone) errors["contact.phone"] = "رقم الهاتف مطلوب";

    // Validate passenger information
    passengers.forEach((p, idx) => {
      if (!p.firstName)
        errors[`passengers.${idx}.firstName`] = "الاسم الأول مطلوب";
      if (!p.lastName) errors[`passengers.${idx}.lastName`] = "الكنية مطلوبة";
      if (!p.phone) errors[`passengers.${idx}.phone`] = "رقم الهاتف مطلوب";
      if (!p.gender) errors[`passengers.${idx}.gender`] = "الجنس مطلوب";
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("يرجى تصحيح الحقول المميزة");
      return false;
    }

    return true;
  };

  const handleBook = async (e) => {
    e.preventDefault();
    console.log("Starting booking process");

    if (!user?._id) {
      console.error("No user ID available");
      return;
    }

    if (!creditCard) {
      console.error("No credit card available");
      setError("يرجى إضافة بطاقة ائتمان في الإعدادات قبل الحجز");
      return;
    }

    console.log("Credit card state:", creditCard);

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Calculate total amount
    const totalAmount = trip.cost * noOfSeats;
    console.log("Total amount:", totalAmount);
    console.log("Credit card balance:", creditCard.balance);

    // Check credit card balance
    if (creditCard.balance < totalAmount) {
      setError(
        `الرصيد غير كافي. المطلوب: ${totalAmount} ل.س، المتاح: ${creditCard.balance} ل.س`
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Prepare booking data
      const bookingData = {
        tripID: trip._id,
        noOfSeats,
        contact: {  // Add contact info to the booking data
          email: user?.email || contact.email,
          phone: user?.phone || contact.phone,
        },
        passengers: passengers.map((p) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          phone: p.phone,
          gender: p.gender,
          age: parseInt(p.age) || 0,
        })),
      };

      console.log(
        "Sending booking request with data:",
        JSON.stringify(bookingData, null, 2)
      );

      const response = await axios.post(
        "http://localhost:5001/api/user/book-trip",
        bookingData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log("Booking response:", response.data);

      if (response.data.success) {
        // Update credit card balance in state
        setCreditCard((prev) => ({
          ...prev,
          balance: response.data.data.creditCard.balance,
        }));

        // Show success message
        setSuccess("تم تأكيد الحجز بنجاح!");

        // Navigate to my trips after 2 seconds
        setTimeout(() => {
          navigate("/my-trips");
        }, 2000);
      }
    } catch (error) {
      console.error("Booking error:", error.response?.data || error);
      setError(
        error.response?.data?.message ||
          "حدث خطأ أثناء معالجة الحجز. يرجى المحاولة مرة أخرى."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!trip) {
    return null; // Will redirect due to useEffect
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      {/* Section Title Bar */}
      <div className="w-full bg-[#18587A] py-4 text-center text-white text-2xl font-bold rtl:font-sans">
        إكمال عملية الحجز
      </div>
      
      {/* Real-time Booking Updates */}
      {trip?._id && (
        <RealTimeBooking 
          tripId={trip._id}
          initialSeatsAvailable={availableSeatsCount > 0 ? availableSeatsCount : trip.seatsAvailable}
          onSeatsUpdate={handleSeatsUpdate}
        />
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center py-8 px-0 w-full">
        <div className="w-full flex flex-col md:flex-row gap-8">
          {/* Left: Contact & Passenger Info */}
          <div className="flex-1 space-y-6">
            {/* Credit Card Info */}
            <div className="bg-white rounded-xl shadow p-6 mb-4">
              <h3 className="text-right text-lg font-bold mb-4 rtl:font-sans">
                معلومات البطاقة
              </h3>
              {loadingCard ? (
                <div className="text-gray-500 text-sm text-right">
                  جاري تحميل معلومات البطاقة...
                </div>
              ) : creditCard ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">الرصيد المتاح</span>
                    <span className="font-bold text-primary-600">
                      {creditCard.balance.toLocaleString()} ل.س
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">رقم البطاقة</span>
                    <span className="font-bold">
                      •••• {creditCard.cardNumberLast4}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">نوع البطاقة</span>
                    <span className="font-bold capitalize">
                      {creditCard.brand}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-red-600 mb-4">
                    لا توجد بطاقة ائتمان متاحة
                  </p>
                  <button
                    onClick={() => navigate("/settings")}
                    className="btn-primary"
                  >
                    إضافة بطاقة ائتمان
                  </button>
                </div>
              )}
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-xl shadow p-6 mb-4">
              <h3 className="text-right text-lg font-bold mb-4 rtl:font-sans">
                معلومات التواصل
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="input-field text-right rtl:text-right bg-gray-100 cursor-not-allowed">
                    {user?.email || "لا يوجد بريد إلكتروني"}
                  </div>
                  <input
                    type="hidden"
                    name="email"
                    value={user?.email || ""}
                  />
                </div>
                <div>
                  <div className="input-field text-right rtl:text-right bg-gray-100 cursor-not-allowed">
                    {user?.phone || "لا يوجد رقم هاتف"}
                  </div>
                  <input
                    type="hidden"
                    name="phone"
                    value={user?.phone || ""}
                  />
                </div>
                {(!user?.email || !user?.phone) && (
                  <div className="text-yellow-600 text-sm text-right">
                    يرجى تحديث معلوماتك الشخصية من صفحة الملف الشخصي
                  </div>
                )}
              </div>
            </div>

            {/* Number of Seats Selection */}
            <div className="bg-white rounded-xl shadow p-6 mb-4">
              <h3 className="text-right text-lg font-bold mb-4 rtl:font-sans">
                عدد المقاعد
              </h3>
              <div className="space-y-4">
                <select
                  value={noOfSeats}
                  onChange={handleSeatsChange}
                  className="input-field text-right rtl:text-right"
                  disabled={loadingSeats}
                >

                  {loadingSeats ? (
                    <option>جاري تحميل المقاعد المتاحة...</option>
                  ) : (
                    Array.from(
                      { length: Math.min(availableSeatsCount, 10) },
                      (_, i) => i + 1
                    ).map((num) => (
                      <option key={num} value={num}>
                        {num} مقعد{num > 1 ? "ات" : ""}
                      </option>
                    ))
                  )}
                </select>
                {loadingSeats ? (
                  <div className="text-gray-500 text-sm text-right">
                    جاري التحقق من المقاعد المتاحة...
                  </div>
                ) : (
                  <div className="text-gray-600 text-sm text-right">
                    {availableSeatsCount} مقعد متاح (من أصل {trip?.bus?.seats || 'غير محدد'})
                  </div>
                )}
              </div>
            </div>

            {/* Passenger Info */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-right text-lg font-bold mb-4 rtl:font-sans">
                معلومات الركاب
              </h3>
              <div className="space-y-4">
                {passengers.map((p, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="firstName"
                      placeholder="الاسم الأول"
                      className={`input-field text-right rtl:text-right ${
                        fieldErrors[`passengers.${idx}.firstName`]
                          ? "border-red-500"
                          : ""
                      }`}
                      value={p.firstName}
                      onChange={(e) => handlePassengerChange(idx, e)}
                    />
                    {fieldErrors[`passengers.${idx}.firstName`] && (
                      <div className="text-red-500 text-xs mt-1 text-right col-span-2">
                        {fieldErrors[`passengers.${idx}.firstName`]}
                      </div>
                    )}
                    <input
                      type="text"
                      name="lastName"
                      placeholder="الكنية"
                      className={`input-field text-right rtl:text-right ${
                        fieldErrors[`passengers.${idx}.lastName`]
                          ? "border-red-500"
                          : ""
                      }`}
                      value={p.lastName}
                      onChange={(e) => handlePassengerChange(idx, e)}
                    />
                    {fieldErrors[`passengers.${idx}.lastName`] && (
                      <div className="text-red-500 text-xs mt-1 text-right col-span-2">
                        {fieldErrors[`passengers.${idx}.lastName`]}
                      </div>
                    )}
                    <input
                      type="text"
                      name="phone"
                      placeholder="رقم الهاتف"
                      className={`input-field text-right rtl:text-right col-span-2 ${
                        fieldErrors[`passengers.${idx}.phone`]
                          ? "border-red-500"
                          : ""
                      }`}
                      value={p.phone}
                      onChange={(e) => handlePassengerChange(idx, e)}
                    />
                    {fieldErrors[`passengers.${idx}.phone`] && (
                      <div className="text-red-500 text-xs mt-1 text-right col-span-2">
                        {fieldErrors[`passengers.${idx}.phone`]}
                      </div>
                    )}
                    <select
                      name="gender"
                      className={`input-field text-right rtl:text-right col-span-2 ${
                        fieldErrors[`passengers.${idx}.gender`]
                          ? "border-red-500"
                          : ""
                      }`}
                      value={p.gender}
                      onChange={(e) => handlePassengerChange(idx, e)}
                    >
                      <option value="">اختر الجنس</option>
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                    {fieldErrors[`passengers.${idx}.gender`] && (
                      <div className="text-red-500 text-xs mt-1 text-right col-span-2">
                        {fieldErrors[`passengers.${idx}.gender`]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="text-red-600 text-center">{error}</div>}
            {success && (
              <div className="text-green-600 text-center">{success}</div>
            )}
            <button
              type="button"
              className="btn-primary w-full mt-4"
              onClick={handleBook}
              disabled={loading || loadingSeats}
            >
              {loading ? "...جاري الحجز" : "إتمام عملية الحجز"}
            </button>
          </div>

          {/* Right: Trip & Company Info */}
          <div className="flex-1 max-w-md bg-white rounded-xl shadow p-6 self-start">
            <div className="flex items-center mb-4">
              <img
                src={trip.company?.logo || "/images/logo-placeholder.png"}
                alt={trip.company?.companyName || "Company Logo"}
                className="w-16 h-16 rounded-full object-contain border border-gray-200 ml-4 rtl:ml-0 rtl:mr-4"
              />
              <div>
                <h4 className="text-lg font-bold rtl:font-sans">
                  {trip.company?.companyName || "الشركة غير معروفة"}
                </h4>
              </div>
            </div>
            <div className="mb-2 flex justify-between text-right rtl:text-right">
              <span className="text-gray-600">نقطة الانطلاق</span>
              <span className="font-bold text-primary-600">{trip.origin}</span>
            </div>
            <div className="mb-2 flex justify-between text-right rtl:text-right">
              <span className="text-gray-600">نقطة الوصول</span>
              <span className="font-bold text-primary-600">
                {trip.destination}
              </span>
            </div>
            <div className="mb-2 flex justify-between text-right rtl:text-right">
              <span className="text-gray-600">عدد المقاعد المختارة</span>
              <span className="font-bold">{noOfSeats}</span>
            </div>
            <div className="mb-2 flex justify-between text-right rtl:text-right">
              <span className="text-gray-600">وقت المغادرة</span>
              <span className="font-bold">
                {new Date(trip.departureDate).toLocaleDateString("ar-SY", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                <br />
                {trip.departureTime}
              </span>
            </div>
            <div className="mb-2 text-right rtl:text-right text-gray-600 text-sm">
              <span className="font-bold">إلغاء التذكرة</span>
              <br />
              يمكن إلغاء أو تغيير تذكرتك قبل 6 ساعات من موعد المغادرة، لا يمكن
              فتح تذكرتك.
            </div>
            <div className="mt-6 text-right rtl:text-right">
              <span className="text-lg font-bold text-primary-600">
                {(trip.cost * noOfSeats).toLocaleString()} ل.س
              </span>
              <div className="text-sm text-gray-500">
                {trip.cost.toLocaleString()} ل.س × {noOfSeats} مقعد
              </div>
              {creditCard && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-600">
                    الرصيد المتبقي بعد الحجز:{" "}
                  </span>
                  <span
                    className={`font-bold ${
                      creditCard.balance >= trip.cost * noOfSeats
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {(
                      creditCard.balance -
                      trip.cost * noOfSeats
                    ).toLocaleString()}{" "}
                    ل.س
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Booking;
