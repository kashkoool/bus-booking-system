import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';

const BookingQRCodePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQRCode = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `http://localhost:5001/api/user/booking/${id}/qrcode`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (response.data.success) {
          setQrCodeDataUrl(response.data.qrCodeDataUrl);
          setBookingUrl(response.data.bookingUrl);
        } else {
          setError('فشل في جلب رمز QR');
        }
      } catch (err) {
        console.error('QR Code fetch error:', err);
        setError('فشل في جلب رمز QR');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchQRCode();
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <div className="w-full bg-[#18587A] py-4 text-center text-white text-2xl font-bold rtl:font-sans">
        رمز QR للحجز
      </div>
      <div className="flex-1 flex flex-col items-center justify-center py-8 px-4">
        {loading ? (
          <div className="text-lg text-gray-600">...جاري التحميل</div>
        ) : error ? (
          <div className="text-red-600 text-lg">{error}</div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <img
              src={qrCodeDataUrl}
              alt="QR Code for Booking"
              className="w-64 h-64 border-4 border-gray-200 rounded-lg shadow-lg"
            />
            <div className="text-center space-y-4">
              <div className="text-gray-700 text-lg mb-4">امسح رمز QR لعرض تفاصيل الحجز</div>
              
              {/* Mobile Link (QR Code URL) */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-sm font-semibold text-blue-800 mb-2">رابط للهاتف المحمول:</div>
                <a 
                  href={bookingUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 break-all hover:text-blue-800 underline"
                >
                  {bookingUrl}
                </a>
              </div>
              
              {/* PC Link (Localhost URL) */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-sm font-semibold text-green-800 mb-2">رابط للكمبيوتر:</div>
                <a 
                  href={bookingUrl.replace('172.20.10.3', 'localhost')} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-green-600 break-all hover:text-green-800 underline"
                >
                  {bookingUrl.replace('172.20.10.3', 'localhost')}
                </a>
              </div>
            </div>
          
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default BookingQRCodePage; 