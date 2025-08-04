// src/pages/admin/reports/SystemReportsPage.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaFilePdf, 
  FaDownload, 
  FaChartLine, 
  FaUsers, 
  FaRoute, 
  FaBuilding, 
  FaDollarSign,
  FaArrowLeft,
  FaInfoCircle
} from 'react-icons/fa';
import axios from 'axios';
import AdminLayout from '../../layouts/AdminLayout';

const BASE_URL = 'http://localhost:5000';

const SystemReportsPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // دالة لتحميل التقرير
  const downloadReport = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/admin/reports/system`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob' // مهم لاستقبال ملف PDF
      });

      // إنشاء رابط لتحميل الملف
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'system_report.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      setSuccessMessage('تم تحميل التقرير بنجاح');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'حدث خطأ أثناء تحميل التقرير';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* رسائل النجاح والخطأ */}
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <FaDownload className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <FaFilePdf className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* العنوان وأزرار الإجراءات */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              <FaChartLine className="mr-2 text-blue-600" />
              التقارير النظامية
            </h1>
            <p className="mt-1 text-gray-600">عرض وتحميل التقارير الشاملة للنظام</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-2">
            <button
              onClick={downloadReport}
              disabled={loading}
              className={`flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                  جاري التحميل...
                </>
              ) : (
                <>
                  <FaDownload className="mr-2" />
                  تحميل التقرير
                </>
              )}
            </button>
            <Link 
              to="/admin/dashboard" 
              className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md"
            >
              <FaArrowLeft className="mr-2" />
              العودة للوحة التحكم
            </Link>
          </div>
        </div>

        {/* معلومات التقرير */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="p-6">
            <div className="flex flex-col md:flex-row">
              {/* صورة التقرير */}
              <div className="md:w-1/4 flex justify-center md:justify-start mb-6 md:mb-0">
                <div className="bg-red-50 border border-red-200 rounded-xl w-48 h-48 flex items-center justify-center text-red-500">
                  <FaFilePdf className="text-6xl" />
                </div>
              </div>
              
              {/* تفاصيل التقرير */}
              <div className="md:w-3/4 md:pl-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">تقرير النظام الشامل</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center">
                    <FaFilePdf className="text-red-500 ml-2" />
                    <div>
                      <p className="text-sm text-gray-500">نوع التقرير</p>
                      <p className="text-gray-700">PDF - تقرير شامل</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <FaChartLine className="text-blue-500 ml-2" />
                    <div>
                      <p className="text-sm text-gray-500">آخر تحديث</p>
                      <p className="text-gray-700">اليوم</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <FaUsers className="text-purple-500 ml-2" />
                    <div>
                      <p className="text-sm text-gray-500">محتوى التقرير</p>
                      <p className="text-gray-700">إحصائيات المستخدمين والرحلات والشركات</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <FaDollarSign className="text-green-500 ml-2" />
                    <div>
                      <p className="text-sm text-gray-500">المحتوى المالي</p>
                      <p className="text-gray-700">الإيرادات والإيرادات المتوقعة</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <FaInfoCircle className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">معلومات مهمة</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>• يحتوي هذا التقرير على أحدث البيانات الإحصائية للنظام</p>
                        <p>• يتم تحديث البيانات وقت طلب التقرير</p>
                        <p>• يمكنك تحميل التقرير بالنقر على زر "تحميل التقرير"</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* محتويات التقرير المتوقعة */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">محتويات التقرير</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* قسم المستخدمين */}
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <div className="flex items-center mb-3">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600 mr-3">
                    <FaUsers className="text-lg" />
                  </div>
                  <h3 className="text-lg font-semibold text-purple-800">المستخدمين</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    إجمالي المستخدمين
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    العملاء
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    الموظفين
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    مدراء الشركات
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    المشرفين
                  </li>
                </ul>
              </div>
              
              {/* قسم الرحلات */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center mb-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600 mr-3">
                    <FaRoute className="text-lg" />
                  </div>
                  <h3 className="text-lg font-semibold text-blue-800">الرحلات</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    إجمالي الرحلات
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    الرحلات النشطة
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    الرحلات المكتملة
                  </li>
                </ul>
              </div>
              
              {/* قسم الشركات */}
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="flex items-center mb-3">
                  <div className="p-2 rounded-lg bg-green-100 text-green-600 mr-3">
                    <FaBuilding className="text-lg" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-800">الشركات</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    إجمالي الشركات
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    الشركات النشطة
                  </li>
                </ul>
              </div>
              
              {/* قسم الإيرادات */}
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
                <div className="flex items-center mb-3">
                  <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600 mr-3">
                    <FaDollarSign className="text-lg" />
                  </div>
                  <h3 className="text-lg font-semibold text-yellow-800">الإيرادات</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                    الإيرادات المحققة
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                    الإيرادات المتوقعة
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* كيفية الاستخدام */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">كيفية استخدام التقرير</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <span className="font-bold">1</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-800">تحميل التقرير</h3>
                  <p className="mt-1 text-gray-600">
                    انقر على زر "تحميل التقرير" لتنزيل أحدث نسخة من تقرير النظام بصيغة PDF
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <span className="font-bold">2</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-800">مراجعة البيانات</h3>
                  <p className="mt-1 text-gray-600">
                    افتح الملف لمراجعة أحدث الإحصائيات والمؤشرات حول أداء النظام
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <span className="font-bold">3</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-800">اتخاذ القرارات</h3>
                  <p className="mt-1 text-gray-600">
                    استخدم البيانات في التقرير لاتخاذ القرارات الإدارية وتحسين أداء النظام
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SystemReportsPage;