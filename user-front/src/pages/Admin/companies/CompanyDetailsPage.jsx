// src/pages/admin/companies/CompanyDetailsPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FaBuilding, 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaInfoCircle,
  FaBus,
  FaRoute,
  FaEdit,
  FaTrash,
  FaArrowLeft,
  FaToggleOn,
  FaToggleOff,
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUsers // أيقونة جديدة للموظفين
} from 'react-icons/fa';
import axios from 'axios';
import AdminLayout from '../../../layouts/AdminLayout';

const BASE_URL = 'http://localhost:5001';

const CompanyDetailsPage = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // جلب بيانات الشركة والمدير من الخادم
  useEffect(() => {
    const fetchCompanyDetails = async () => {
      try {
        setLoading(true);
        setError('');
        
        const token = localStorage.getItem('token');
        const response = await axios.get(`${BASE_URL}/api/admin/${companyId}/manager`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
console.log(response.data.data.company);

        // التحقق من هيكل البيانات المرتجع
        if (response.data.data.company && response.data.data.manager) {
          setCompany(response.data.data.company);
          setManager(response.data.data.manager);
        } else {
          throw new Error('هيكل البيانات غير متوقع. الرجاء التحقق من نقطة النهاية.');
        }
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'حدث خطأ أثناء جلب بيانات الشركة';
        setError(errorMsg);
        console.error('Error fetching company details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyDetails();
  }, [companyId]);

  // دالة لتغيير حالة الشركة (تفعيل/تعطيل)
  const toggleCompanyStatus = async () => {
    try {
      setTogglingStatus(true);
      setError('');
      setSuccessMessage('');
      
      const token = localStorage.getItem('token');
      const action =  company.status==='active' ? 'inactive' : 'active';
      
      await axios.patch(
        `${BASE_URL}/api/admin/${companyId}/activation`,
        { action },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // تحديث حالة الشركة في الواجهة
      setCompany(prev => ({ ...prev, isActive: !company.isActive }));
      setSuccessMessage(`تم ${company.status==='active' ? 'تعطيل' :'تفعيل' } الشركة بنجاح`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'حدث خطأ أثناء تغيير حالة الشركة';
      setError(errorMsg);
    } finally {
      setTogglingStatus(false);
    }
  };

  // دالة لحذف الشركة
  const deleteCompany = async () => {
    if (!window.confirm('هل أنت متأكد أنك تريد حذف هذه الشركة؟ سيتم حذف جميع البيانات المرتبطة بها بما في ذلك الموظفين والحافلات.')) {
      return;
    }
    
    try {
      setDeleting(true);
      setError('');
      setSuccessMessage('');
      
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${BASE_URL}/api/admin/${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        setSuccessMessage('تم حذف الشركة بنجاح');
        setTimeout(() => {
          navigate('/admin/companies');
        }, 1500);
      } else {
        throw new Error(response.data.message || 'فشل في حذف الشركة');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'فشل في حذف الشركة';
      setError(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  // دالة لعرض تقييم الشركة بنجوم - معدلة لتعرض القيمة الصحيحة
  const renderRatingStars = (rating) => {
    // إذا لم يكن التقييم موجودًا أو كان صفرًا، نعرض رسالة
    if (!rating || rating === 0) {
      return <span className="text-gray-500">لا توجد تقييمات بعد</span>;
    }
    
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    
    return (
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => (
          <FaStar key={`full-${i}`} className="text-yellow-400" />
        ))}
        {[...Array(halfStar)].map((_, i) => (
          <FaStarHalfAlt key={`half-${i}`} className="text-yellow-400" />
        ))}
        {[...Array(emptyStars)].map((_, i) => (
          <FaRegStar key={`empty-${i}`} className="text-yellow-400" />
        ))}
        <span className="mr-2 text-gray-700">{rating?.toFixed(1)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mr-3 text-gray-600">جاري تحميل بيانات الشركة...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!company) {
    return (
      <AdminLayout>
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">
            <FaBuilding className="mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">الشركة غير موجودة</h2>
          <p className="text-gray-600 mb-6">لم يتم العثور على شركة بالمعرف المطلوب</p>
          <button 
            onClick={() => navigate('/admin/companies/list')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            العودة إلى قائمة الشركات
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* رسائل النجاح والخطأ */}
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <FaCheckCircle className="h-5 w-5 text-green-400" />
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
                <FaExclamationTriangle className="h-5 w-5 text-red-400" />
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
              <FaBuilding className="mr-2 text-blue-600" />
              تفاصيل الشركة: {company.name}
            </h1>
            <p className="mt-1 text-gray-600">عرض كافة المعلومات المتعلقة بالشركة ومديرها</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-2">
            <Link 
              to={`/admin/companies/edit/${companyId}`}
              className="flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors shadow-md"
            >
              <FaEdit className="mr-2" />
              تعديل الشركة
            </Link>
            <button
              onClick={deleteCompany}
              disabled={deleting}
              className={`flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md ${
                deleting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {deleting ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                  جاري الحذف...
                </>
              ) : (
                <>
                  <FaTrash className="mr-2" />
                  حذف الشركة
                </>
              )}
            </button>
            <Link 
              to="/admin/companies/list" 
              className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md"
            >
              <FaArrowLeft className="mr-2" />
              العودة للقائمة
            </Link>
          </div>
        </div>

        {/* بطاقة معلومات الشركة */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="p-6">
            <div className="flex flex-col md:flex-row">
              {/* شعار الشركة */}
              <div className="md:w-1/4 flex justify-center md:justify-start mb-6 md:mb-0">
                {company.logo ? (
                  <img 
                    src={`http://localhost:5001${company.logo}`} 
                    alt={company.name} 
                    className="h-48 w-48 rounded-xl object-cover border border-gray-200 shadow-sm"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.parentNode.innerHTML = `
                        <div class="bg-gray-100 border border-gray-300 rounded-xl w-48 h-48 flex items-center justify-center text-gray-500">
                          <FaBuilding class="text-4xl text-gray-400" />
                        </div>
                      `;
                    }}
                  />
                ) : (
                  <div className="bg-gray-100 border border-gray-300 rounded-xl w-48 h-48 flex items-center justify-center text-gray-500">
                    <FaBuilding className="text-4xl text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* تفاصيل الشركة */}
              <div className="md:w-3/4 md:pl-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">{company.name}</h2>
                  
                  {/* زر حالة الشركة - تم التصحيح هنا */}
                  <button
                    onClick={toggleCompanyStatus}
                    disabled={togglingStatus}
                    className={`mt-2 md:mt-0 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      company.status==='active'
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    } transition-colors ${togglingStatus ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {togglingStatus ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2"></span>
                        جاري التحميل...
                      </>
                    ) :  company.status==='active' ? (
                      <>
                        <FaToggleOn className="mr-1" /> نشطة
                      </>
                    ) : (
                      <>
                        <FaToggleOff className="mr-1" /> غير نشطة
                      </>
                    )}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <FaEnvelope className="text-gray-500 ml-2" />
                    <div>
                      <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                      <p className="text-gray-700">
                        <a href={`mailto:${company.contactEmail}`} className="text-blue-600 hover:underline">
                          {company.contactEmail}
                        </a>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <FaPhone className="text-gray-500 ml-2" />
                    <div>
                      <p className="text-sm text-gray-500">الهاتف</p>
                      <p className="text-gray-700">
                        <a href={`tel:${company.contactPhone}`} className="text-blue-600 hover:underline">
                          {company.contactPhone}
                        </a>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <FaMapMarkerAlt className="text-gray-500 ml-2 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">العنوان</p>
                      <p className="text-gray-700">{company.address}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <FaStar className="text-gray-500 ml-2" />
                    <div>
                      <p className="text-sm text-gray-500">التقييم</p>
                      <div className="text-gray-700">
                        {renderRatingStars(company.rating)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <FaBus className="text-gray-500 ml-2" />
                    <div>
                      <p className="text-sm text-gray-500">عدد الحافلات</p>
                      <p className="text-gray-700">{company.buses?.length || 0} حافلة</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <FaRoute className="text-gray-500 ml-2" />
                    <div>
                      <p className="text-sm text-gray-500">عدد الرحلات</p>
                      <p className="text-gray-700">{company.trips?.length || 0} رحلة</p>
                    </div>
                  </div>
                </div>
                
                {company.description && (
                  <div className="mt-6">
                    <div className="flex items-center mb-2">
                      <FaInfoCircle className="text-gray-500 ml-2" />
                      <p className="text-sm text-gray-500">الوصف</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-700">{company.description}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* بطاقة معلومات المدير */}
        {manager && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <FaUser className="mr-2 text-blue-600" />
                المدير الرئيسي
              </h2>
              
              <div className="flex flex-col md:flex-row">
                {/* صورة المدير (افتراضية) */}
                <div className="md:w-1/4 flex justify-center md:justify-start mb-6 md:mb-0">
                  <div className="bg-gray-100 border border-gray-300 rounded-xl w-48 h-48 flex items-center justify-center text-gray-500">
                    <FaUser className="text-4xl text-gray-400" />
                  </div>
                </div>
                
                {/* تفاصيل المدير */}
                <div className="md:w-3/4 md:pl-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <FaUser className="text-gray-500 ml-2" />
                      <div>
                        <p className="text-sm text-gray-500">الاسم الكامل</p>
                        <p className="text-gray-700">{manager.firstName} {manager.lastName}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <FaEnvelope className="text-gray-500 ml-2" />
                      <div>
                        <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                        <p className="text-gray-700">
                          <a href={`mailto:${manager.email}`} className="text-blue-600 hover:underline">
                            {manager.email}
                          </a>
                        </p>
                      </div>
                    </div>
                    
                    {manager.phone && (
                      <div className="flex items-center">
                        <FaPhone className="text-gray-500 ml-2" />
                        <div>
                          <p className="text-sm text-gray-500">الهاتف</p>
                          <p className="text-gray-700">
                            <a href={`tel:${manager.phone}`} className="text-blue-600 hover:underline">
                              {manager.phone}
                            </a>
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <div className="ml-2">
                        <p className="text-sm text-gray-500">الحالة</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          manager.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : manager.status === 'inactive' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {manager.status === 'active' ? 'نشط' : manager.status === 'inactive' ? 'غير نشط' : manager.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="ml-2">
                        <p className="text-sm text-gray-500">تاريخ التسجيل</p>
                        <p className="text-gray-700">
                          {new Date(manager.createdAt).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {manager.permissions && manager.permissions.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center mb-2">
                        <p className="text-sm text-gray-500">الصلاحيات</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {manager.permissions.map((permission, index) => (
                          <span 
                            key={index} 
                            className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded"
                          >
                            {permission}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* إحصائيات إضافية */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* بطاقة الموظفين بدلاً من المدراء */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100 text-blue-600 mr-3">
                <FaUsers className="text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-500">عدد الموظفين</p>
                <p className="text-xl font-bold text-gray-800">{company.employeesCount || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100 text-green-600 mr-3">
                <FaBus className="text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-500">الحافلات النشطة</p>
                <p className="text-xl font-bold text-gray-800">
                  {company.buses?.filter(bus => bus.status === 'active').length || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-100 text-purple-600 mr-3">
                <FaRoute className="text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-500">الرحلات النشطة</p>
                <p className="text-xl font-bold text-gray-800">
                  {company.trips?.filter(trip => trip.status === 'active').length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CompanyDetailsPage;