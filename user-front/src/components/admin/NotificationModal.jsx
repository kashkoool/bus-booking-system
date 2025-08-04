import React, { useState } from 'react';
import { FaPaperPlane, FaTimes, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api/admin';

const NotificationModal = ({ isOpen, onClose, companyIds = [] }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [loading, setLoading] = useState(false);

  const notificationTypes = [
    { value: 'info', label: 'إعلام' },
    { value: 'update', label: 'تحديث' },
    { value: 'system', label: 'نظام' },
    { value: 'payment', label: 'دفع' },
    { value: 'booking_confirmation', label: 'تأكيد الحجز' },
    { value: 'trip_cancellation', label: 'إلغاء رحلة' },
  ];

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setType('info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !message || !type) {
      toast.error('الرجاء إدخال العنوان والرسالة ونوع الإشعار');
      return;
    }

    if (!companyIds || companyIds.length === 0) {
      toast.error('لم يتم تحديد شركات لإرسال الإشعار لها');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/notifications/send`,
        { companyIds, title, message, type },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      toast.success(`تم إرسال الإشعار إلى ${companyIds.length} شركة بنجاح`);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error sending notification:', error);
      const errorMessage = error.response?.data?.message || 'فشل إرسال الإشعار';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">إرسال إشعار جديد</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <FaTimes size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-right text-gray-700 font-medium mb-2">
              عنوان الإشعار
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="type" className="block text-right text-gray-700 font-medium mb-2">
              نوع الإشعار
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {notificationTypes.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-6">
            <label htmlFor="message" className="block text-right text-gray-700 font-medium mb-2">
              محتوى الرسالة
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows="5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            ></textarea>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
              <span className="mr-2">إرسال</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotificationModal; 