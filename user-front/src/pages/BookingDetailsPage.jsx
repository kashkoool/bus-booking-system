import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const BookingDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  console.log('🚀 BookingDetailsPage component loaded');
  console.log('📋 URL params:', useParams());
  console.log('🆔 Booking ID from URL:', id);
  console.log('📍 Current location:', window.location.href);

  useEffect(() => {
    const fetchBooking = async () => {
      console.log('Fetching booking with ID:', id);
      setLoading(true);
      setError('');
      try {
        // Use the same host as the current page for API calls
        const currentHost = window.location.hostname;
        const apiUrl = `http://${currentHost}:5001/api/user/public/booking/${id}`;
        console.log('🌐 Making API call to:', apiUrl);
        
        const response = await axios.get(apiUrl);
        console.log('Booking API response:', response.data);
        if (response.data.success && response.data.data) {
          setBooking(response.data.data);
        } else {
          setError('لم يتم العثور على الحجز');
        }
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError('فشل في جلب بيانات الحجز');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchBooking();
  }, [id]);

  // Helper to check if booking is confirmed and paid
  const isPaid = booking && (booking.paymentStatus === 'paid' || booking.paymentStatus === 'completed') && booking.status === 'confirmed';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="bg-blue-100 p-8 rounded-lg border border-blue-300">
        <h1 className="text-2xl font-bold text-blue-800 mb-4">Booking Details Page </h1>
        
        {loading ? (
          <div className="text-lg text-gray-600">...جاري التحميل</div>
        ) : error ? (
          <div className="text-red-600 text-lg mt-10">{error}</div>
        ) : booking ? (
          <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md text-right rtl:text-right border border-gray-200 relative flex flex-col items-center mt-8">
            {isPaid && (
              <div className="flex flex-col items-center mb-8">
                <div className="bg-green-100 rounded-full p-5 mb-3 shadow">
                  <svg className="w-20 h-20 text-green-500" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-green-700 text-2xl font-bold mb-2">تم حجز التذكرة بنجاح وتم الدفع</div>
              </div>
            )}
            <h2 className="text-xl font-bold mb-6 text-center text-gray-800">بيانات الحجز</h2>
            <div className="space-y-4 w-full">
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold text-gray-600">الشركة:</span>
                <span className="text-gray-900">{booking.trip?.company?.name || 'غير معروف'}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold text-gray-600">المسار:</span>
                <span className="text-gray-900">{booking.trip?.origin} → {booking.trip?.destination}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold text-gray-600">عدد المقاعد:</span>
                <span className="text-gray-900">{booking.passengers?.length}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold text-gray-600">المبلغ:</span>
                <span className="text-gray-900">{booking.formattedTotalAmount || booking.totalAmount} ل.س</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold text-gray-600">تاريخ الرحلة:</span>
                <span className="text-gray-900">{booking.trip?.departureDate ? new Date(booking.trip.departureDate).toLocaleDateString('ar-SY') : ''}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold text-gray-600">وقت المغادرة:</span>
                <span className="text-gray-900">{booking.trip?.departureTime}</span>
              </div>
              <div className="text-lg">
                <span className="font-semibold text-gray-600">الركاب:</span>
                <ul className="list-disc pr-6 mt-2">
                  {booking.passengers?.map((p, i) => (
                    <li key={i} className="text-gray-900">{p.firstName} {p.lastName} - مقعد {p.seatNumber}</li>
                  ))}
                </ul>
              </div>
            </div>
          
          </div>
        ) : (
          <div className="text-gray-600">No booking data available</div>
        )}
      </div>
    </div>
  );
};

export default BookingDetailsPage; 