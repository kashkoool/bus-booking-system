import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaTicketAlt, 
  FaUser, 
  FaPhone, 
  FaCalendarAlt, 
  FaMoneyBillWave,
  FaSpinner,
  FaCheck,
  FaExclamationTriangle,
  FaPlus,
  FaTrash
} from 'react-icons/fa';
import axios from 'axios';
import StaffLayout from '../../layouts/StaffLayout';

const CounterBookingPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [passengers, setPassengers] = useState([
    { firstName: '', lastName: '', gender: 'male', phone: '' }
  ]);
  const [userEmail, setUserEmail] = useState('');
  const [amountPaid, setAmountPaid] = useState(0);
  const [userEditedAmount, setUserEditedAmount] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch available trips
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5001/api/staff/trips/search', {
          headers: { Authorization: `Bearer ${token}` },
          params: { status: 'scheduled', limit: 50 }
        });
        
        if (response.data && response.data.success) {
          setTrips(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching trips:', error);
        setErrors({ general: 'فشل في تحميل الرحلات المتاحة' });
      }
    };

    fetchTrips();
  }, []);

  // Filter trips based on search
  const filteredTrips = trips.filter(trip => {
    if (!searchQuery) return true;
    return (
      trip.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.bus?.busNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Calculate total amount
  const totalAmount = selectedTrip ? selectedTrip.cost * passengers.length : 0;
  const changeDue = amountPaid - totalAmount;

  const addPassenger = () => {
    setPassengers([...passengers, { firstName: '', lastName: '', gender: 'male', phone: '' }]);
  };

  const removePassenger = (index) => {
    if (passengers.length > 1) {
      setPassengers(passengers.filter((_, i) => i !== index));
    }
  };

  const updatePassenger = (index, field, value) => {
    const updatedPassengers = [...passengers];
    updatedPassengers[index][field] = value;
    setPassengers(updatedPassengers);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!selectedTrip) {
      newErrors.trip = 'يرجى اختيار رحلة';
    }

    if (selectedTrip && selectedTrip.seatsAvailable < passengers.length) {
      newErrors.passengers = `الرحلة تحتوي على ${selectedTrip.seatsAvailable} مقاعد متاحة فقط`;
    }

    passengers.forEach((passenger, index) => {
      if (!passenger.firstName.trim()) {
        newErrors[`passenger${index}FirstName`] = 'الاسم الأول مطلوب';
      }
      if (!passenger.lastName.trim()) {
        newErrors[`passenger${index}LastName`] = 'الاسم الأخير مطلوب';
      }
      if (!passenger.phone.trim()) {
        newErrors[`passenger${index}Phone`] = 'رقم الهاتف مطلوب';
      } else if (!/^[0-9]{10,15}$/.test(passenger.phone)) {
        newErrors[`passenger${index}Phone`] = 'رقم هاتف غير صحيح';
      }
    });

    if (amountPaid < totalAmount) {
      newErrors.amountPaid = `المبلغ المدفوع أقل من المطلوب (${totalAmount} ل.س)`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const token = localStorage.getItem('token');
      const bookingData = {
        tripID: selectedTrip._id,
        passengers: passengers,
        userEmail: userEmail || undefined,
        amountPaid: parseFloat(amountPaid),
        noOfSeats: passengers.length
      };

      const response = await axios.post(
        'http://localhost:5001/api/staff/counter-booking',
        bookingData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.success) {
        setSuccessMessage('تم إنشاء الحجز بنجاح!');
        // Reset form
        setSelectedTrip(null);
        setPassengers([{ firstName: '', lastName: '', gender: 'male', phone: '' }]);
        setUserEmail('');
        setAmountPaid(0);
        setUserEditedAmount(false);
        
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      const errorMessage = error.response?.data?.message || 'فشل في إنشاء الحجز';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userEditedAmount) {
      setAmountPaid(totalAmount);
    }
  }, [totalAmount, userEditedAmount]);

  return (
    <StaffLayout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">حجز تذاكر</h1>
          <p className="text-gray-600">إنشاء حجز جديد للعملاء في المكتب</p>
        </div>

        {errors.general && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <div className="flex items-start">
              <FaExclamationTriangle className="text-red-500 mt-1 mr-2 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">حدث خطأ</h3>
                <p className="text-sm text-red-700 mt-1">{errors.general}</p>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
            <div className="flex items-start">
              <FaCheck className="text-green-500 mt-1 mr-2 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-green-800">نجح الحجز</h3>
                <p className="text-sm text-green-700 mt-1">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Trip Selection */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">اختيار الرحلة</h2>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="البحث في الرحلات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid gap-4 max-h-60 overflow-y-auto">
              {filteredTrips.map((trip) => (
                <div
                  key={trip._id}
                  onClick={() => setSelectedTrip(trip)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTrip?._id === trip._id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {trip.origin} → {trip.destination}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(trip.departureDate).toLocaleDateString('ar-EG')} - {trip.departureTime}
                      </p>
                      <p className="text-sm text-gray-600">
                        الباص: {trip.bus?.busNumber} | المقاعد المتاحة: {trip.seatsAvailable}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{trip.cost} ل.س</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {errors.trip && <p className="mt-2 text-sm text-red-600">{errors.trip}</p>}
          </div>

          {/* Passenger Details */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">تفاصيل المسافرين</h2>
              <button
                type="button"
                onClick={addPassenger}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FaPlus className="mr-2" />
                إضافة مسافر
              </button>
            </div>

            {passengers.map((passenger, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-800">مسافر {index + 1}</h3>
                  {passengers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePassenger(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الاسم الأول *
                    </label>
                    <input
                      type="text"
                      value={passenger.firstName}
                      onChange={(e) => updatePassenger(index, 'firstName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors[`passenger${index}FirstName`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors[`passenger${index}FirstName`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`passenger${index}FirstName`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الاسم الأخير *
                    </label>
                    <input
                      type="text"
                      value={passenger.lastName}
                      onChange={(e) => updatePassenger(index, 'lastName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors[`passenger${index}LastName`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors[`passenger${index}LastName`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`passenger${index}LastName`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الجنس *
                    </label>
                    <select
                      value={passenger.gender}
                      onChange={(e) => updatePassenger(index, 'gender', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      رقم الهاتف *
                    </label>
                    <input
                      type="tel"
                      value={passenger.phone}
                      onChange={(e) => updatePassenger(index, 'phone', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors[`passenger${index}Phone`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors[`passenger${index}Phone`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`passenger${index}Phone`]}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {errors.passengers && <p className="text-sm text-red-600">{errors.passengers}</p>}
          </div>

          {/* Customer Email (Optional) */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">معلومات العميل (اختياري)</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">الدفع</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  المبلغ المدفوع *
                </label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={e => {
                    setAmountPaid(parseFloat(e.target.value) || 0);
                    setUserEditedAmount(true);
                  }}
                  min={totalAmount}
                  step="0.01"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.amountPaid ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.amountPaid && <p className="mt-1 text-sm text-red-600">{errors.amountPaid}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">عدد المسافرين:</span>
                  <span className="font-medium">{passengers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">سعر التذكرة:</span>
                  <span className="font-medium">{selectedTrip?.cost || 0} ل.س</span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>المجموع:</span>
                  <span className="text-green-600">{totalAmount} ل.س</span>
                </div>
                {changeDue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">المتبقي:</span>
                    <span className="text-blue-600">{changeDue} ل.س</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !selectedTrip}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  جاري إنشاء الحجز...
                </>
              ) : (
                <>
                  <FaTicketAlt className="mr-2" />
                  إنشاء الحجز
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </StaffLayout>
  );
};

export default CounterBookingPage; 