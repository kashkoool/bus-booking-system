import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Link } from 'react-router-dom';

const MyTrips = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState("");

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(
        "http://localhost:5001/api/user/confirmed-bookings",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      // Log detailed information about the first booking for debugging
      if (response.data.data && response.data.data.length > 0) {
        const firstBooking = response.data.data[0];
        console.log("First booking object:", firstBooking);
        console.log("First booking's trip object:", firstBooking.trip);
        console.log("First booking's company data:", firstBooking.trip?.company);
        console.log("First booking's companyID:", firstBooking.trip?.companyID);
      }
      
      const bookingsWithFormattedAmount = response.data.data.map((booking) => {
        console.log('Booking status:', booking.status, 'ID:', booking._id);
        console.log('Booking object:', booking);
        return {
          ...booking,
          status: booking.status || 'confirmed', // Default to 'confirmed' if status is undefined
          formattedTotalAmount: booking.totalAmount?.toLocaleString() || '0',
        };
      });
      
      setBookings(bookingsWithFormattedAmount);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError(err.response?.data?.message || "حدث خطأ أثناء جلب الحجوزات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancel = async (bookingId) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في إلغاء هذا الحجز؟")) {
      return;
    }
    
    setCancelError("");
    setCancelSuccess("");
    
    try {
      await axios.put(
        `http://localhost:5001/api/user/cancel-booking/${bookingId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      // Update the UI by removing the cancelled booking
      setBookings(prev => prev.filter(booking => booking.bookingId !== bookingId));
      setCancelSuccess("تم إلغاء الحجز بنجاح");
      setTimeout(() => setCancelSuccess(""), 5000);
    } catch (err) {
      console.error("Error cancelling booking:", err);
      const errorMessage = err.response?.data?.message || "حدث خطأ أثناء محاولة إلغاء الحجز";
      setCancelError(errorMessage);
      setTimeout(() => setCancelError(""), 5000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <div className="w-full bg-[#18587A] py-4 text-center text-white text-2xl font-bold rtl:font-sans">
        رحلاتي
      </div>
      <div className="flex-1 flex flex-col items-center justify-center py-8 px-0 bg-gray-100 w-full">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            <div className="col-span-full text-center text-lg">
              ...جاري التحميل
            </div>
          ) : error ? (
            <div className="col-span-full text-center text-red-600">
              {error}
            </div>
          ) : bookings.length === 0 ? (
            <div className="col-span-full text-center text-gray-500">
              لا توجد رحلات محجوزة.
            </div>
          ) : (
            bookings.map((booking, index) => (
              <div
                key={`${booking._id}-${index}`}
                className="bg-white rounded-lg shadow-md p-6 flex flex-col items-start text-right rtl:text-right"
              >
                {/* Company Info with Cancel Button */}
                <div className="w-full mb-4 border-b pb-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                        {booking.trip?.company?.logo ? (
                          <img
                            src={`http://localhost:5001${booking.trip.company.logo}`}
                            alt={booking.trip.company.name || 'Company'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/48';
                            }}
                          />
                        ) : (
                          <span className="text-gray-500 text-lg">Logo</span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">
                          {booking.trip?.company?.name || 'Unknown Company'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Bus {booking.trip?.busNumber || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {booking.status === "confirmed" && booking.trip && (
                        <>
                          <button
                            onClick={() => handleCancel(booking.bookingId)}
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm whitespace-nowrap"
                          >
                            إلغاء الحجز
                          </button>
                          <Link
                            to={`/booking-qr/${booking.bookingId}`}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                          >
                            عرض رمز QR
                          </Link>
                        </>
                      )}
                      {booking.status === "cancelled" && (
                        <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm font-medium">
                          ملغي
                        </span>
                      )}
                      {booking.status === "invalid_trip" && (
                        <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-sm font-medium">
                          رحلة غير صالحة
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {console.log('Complete Booking Object:', JSON.parse(JSON.stringify(booking)))}
                {console.log('Trip Object:', booking.trip)}
                {console.log('Company Object:', booking.trip?.company)}
                {console.log('Company ID:', booking.trip?.companyID)}
                <div className="mb-2 flex justify-between w-full">
                  <span className="text-gray-600">نقطة الانطلاق</span>
                  <span className="font-bold text-primary-600">
                    {booking.trip?.origin || 'غير متوفر'}
                  </span>
                </div>
                <div className="mb-2 flex justify-between w-full">
                  <span className="text-gray-600">نقطة الوصول</span>
                  <span className="font-bold text-primary-600">
                    {booking.trip?.destination || 'غير متوفر'}
                  </span>
                </div>
                <div className="mb-2 flex justify-between w-full">
                  <span className="text-gray-600">عدد المقاعد المحجوزة</span>
                  <span className="font-bold">{booking.passengers.length}</span>
                </div>
                <div className="mb-2 flex justify-between w-full">
                  <span className="text-gray-600">وقت المغادرة</span>
                  <span className="font-bold">
                    {booking.trip?.departureDate ? 
                      new Date(booking.trip.departureDate).toLocaleDateString(
                        "ar-SY",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      ) : 'غير متوفر'
                    }
                    <br />
                    {booking.trip?.departureTime || 'غير متوفر'}
                  </span>
                </div>
                <div className="mb-2 text-right rtl:text-right text-gray-600 text-sm">
                  <span className="font-bold">إلغاء التذكرة</span>
                  <br />
                  يمكنك إلغاء التذكرة خلال 48 ساعة من موعد الحجز.
                </div>
                <div className="mt-6 text-right rtl:text-right">
                  <span className="text-lg font-bold text-primary-600">
                    {booking.trip?.cost?.toLocaleString() || booking.totalAmount?.toLocaleString() || '0'} ل.س
                  </span>
                </div>


              </div>
            ))
          )}
        </div>
        {cancelError && (
          <div className="text-red-600 text-center mt-4">{cancelError}</div>
        )}
        {cancelSuccess && (
          <div className="text-green-600 text-center mt-4">{cancelSuccess}</div>
        )}
      </div>
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default MyTrips;
