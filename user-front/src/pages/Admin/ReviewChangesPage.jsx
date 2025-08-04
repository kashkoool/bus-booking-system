import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaCheckCircle, FaTimesCircle, FaArrowRight } from 'react-icons/fa';
import AdminLayout from '../../layouts/AdminLayout';
import axios from 'axios';
import { toast } from 'react-toastify';

const ReviewChangesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [changes] = useState(location.state?.changes || {});
  const [isProcessing, setIsProcessing] = useState(false);
  const token = localStorage.getItem('token');

  // If no changes data is available, redirect to dashboard
  useEffect(() => {
    if (!changes || Object.keys(changes).length === 0) {
      navigate('/admin/dashboard');
    }
  }, [changes, navigate]);

  const handleReviewLater = () => {
    navigate('/admin/dashboard');
  };

  const handleReviewCompanies = () => {
    navigate('/admin/companies', { state: { showPending: true } });
  };

  const handleReviewNotifications = () => {
    navigate('/admin/notifications', { state: { filter: 'critical' } });
  };

  const handleProcessAll = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      // Process all pending companies (approve or reject)
      if (changes.pendingCompanies > 0) {
        await axios.post(
          'http://localhost:5000/api/admin/companies/process-all',
          { action: 'approve' }, // or 'reject' based on your requirements
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      // Mark all critical notifications as read
      if (changes.criticalNotifications > 0) {
        await axios.put(
          'http://localhost:5000/api/notifications/mark-all-read',
          { types: ['critical'] },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      toast.success('All changes have been processed successfully');
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Error processing changes:', error);
      toast.error('Failed to process changes. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!changes || Object.keys(changes).length === 0) {
    return null; // Will be redirected by useEffect
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">مراجعة التغييرات المعلقة</h1>
          
          <div className="space-y-6">
            {changes.pendingCompanies > 0 && (
              <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-yellow-800">شركات بانتظار الموافقة</h3>
                    <p className="text-yellow-600">
                      هناك {changes.pendingCompanies} شركة بانتظار مراجعة طلب التسجيل
                    </p>
                  </div>
                  <button
                    onClick={handleReviewCompanies}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    مراجعة الآن <FaArrowRight className="mr-2" />
                  </button>
                </div>
              </div>
            )}

            {changes.criticalNotifications > 0 && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-red-800">إشعارات هامة</h3>
                    <p className="text-red-600">
                      لديك {changes.criticalNotifications} إشعار هام يحتاج إلى مراجعة
                    </p>
                  </div>
                  <button
                    onClick={handleReviewNotifications}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    عرض الإشعارات <FaArrowRight className="mr-2" />
                  </button>
                </div>
              </div>
            )}

            {changes.systemUpdates > 0 && (
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-blue-800">تحديثات النظام</h3>
                    <p className="text-blue-600">
                      هناك {changes.systemUpdates} تحديث متاح للنظام
                    </p>
                  </div>
                  <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    عرض التحديثات <FaArrowRight className="mr-2" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end space-x-4">
            <button
              onClick={handleProcessAll}
              disabled={isProcessing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <FaCheckCircle className="ml-2" />
                  معالجة الكل
                </>
              )}
            </button>
            <button
              onClick={handleReviewLater}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FaTimesCircle className="ml-2" />
              مراجعة لاحقاً
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ReviewChangesPage;
