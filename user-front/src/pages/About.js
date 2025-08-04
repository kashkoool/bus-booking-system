import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  TruckIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  UserGroupIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

const About = () => {
  const [activeSection, setActiveSection] = useState("about");
  const [openFaq, setOpenFaq] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Read URL parameters and set active section
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const section = urlParams.get("section");
    if (
      section &&
      ["about", "services", "terms", "privacy", "faq"].includes(section)
    ) {
      setActiveSection(section);
    }
  }, [location.search]);

  const faqData = [
    {
      id: 1,
      question: "كيف يمكنني حجز رحلة؟",
      answer:
        "يمكنك حجز رحلة بسهولة من خلال موقعنا الإلكتروني أو تطبيق الهاتف المحمول. اختر وجهتك وتاريخ السفر وعدد المقاعد المطلوبة، ثم ادفع عبر البطاقة الائتمانية أو النقد.",
    },
    {
      id: 2,
      question: "هل يمكنني إلغاء الحجز؟",
      answer:
        "نعم، يمكنك إلغاء الحجز قبل 24 ساعة من موعد الرحلة. سيتم خصم رسوم إلغاء بنسبة 10% من المبلغ المدفوع.",
    },
    {
      id: 3,
      question: "ما هي طرق الدفع المتاحة؟",
      answer:
        "نقبل الدفع عبر البطاقات الائتمانية (فيزا، ماستركارد) والدفع النقدي عند استلام التذاكر.",
    },
    {
      id: 4,
      question: "هل تقدمون خدمة تتبع الرحلات؟",
      answer:
        "نعم، نوفر خدمة تتبع الرحلات في الوقت الفعلي من خلال موقعنا الإلكتروني وتطبيق الهاتف المحمول.",
    },
    {
      id: 5,
      question: "ما هي سياسة التأمين؟",
      answer:
        "جميع رحلاتنا مؤمنة بالكامل ضد الحوادث. يغطي التأمين المسافرين والممتلكات الشخصية.",
    },
    {
      id: 6,
      question: "هل تقدمون خدمة العملاء على مدار الساعة؟",
      answer:
        "نعم، فريق خدمة العملاء متاح على مدار الساعة طوال أيام الأسبوع لمساعدتك في أي استفسار أو مشكلة.",
    },
  ];

  const handleSectionChange = (section) => {
    setActiveSection(section);
    // Update URL without page reload
    navigate(`/about?section=${section}`, { replace: true });
  };

  const renderSection = () => {
    switch (activeSection) {
      case "about":
        return (
          <div className="space-y-8 rtl-container">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4 rtl-text">
                عن شركة رحلتي-باص
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto rtl-text">
                نحن شركة رائدة في مجال النقل والحجز عبر الإنترنت، نقدم أفضل
                الخدمات لعملائنا الكرام
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md rtl-text">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 rtl-text">
                  رؤيتنا
                </h3>
                <p className="text-gray-600 rtl-text">
                  نسعى لأن نكون الخيار الأول للعملاء في مجال النقل والحجز، من
                  خلال تقديم خدمات عالية الجودة وأسعار تنافسية.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md rtl-text">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 rtl-text">
                  رسالتنا
                </h3>
                <p className="text-gray-600 rtl-text">
                  توفير تجربة سفر مريحة وآمنة لعملائنا، مع ضمان أعلى معايير
                  الجودة والخدمة المتميزة.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-primary-50 to-primary-100 p-8 rounded-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center rtl-text">
                إحصائيات مهمة
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-primary-600">
                    50,000+
                  </div>
                  <div className="text-gray-600 rtl-text">عميل راضي</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary-600">
                    1000+
                  </div>
                  <div className="text-gray-600 rtl-text">رحلة يومياً</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary-600">50+</div>
                  <div className="text-gray-600 rtl-text">مدينة</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary-600">
                    24/7
                  </div>
                  <div className="text-gray-600 rtl-text">خدمة عملاء</div>
                </div>
              </div>
            </div>
          </div>
        );

      case "services":
        return (
          <div className="space-y-8 rtl-container">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4 rtl-text">
                خدماتنا
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto rtl-text">
                نقدم مجموعة شاملة من الخدمات لتلبية جميع احتياجات السفر الخاصة
                بك
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <TruckIcon className="h-12 w-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3 rtl-text">
                  حجز الرحلات
                </h3>
                <p className="text-gray-600 rtl-text">
                  احجز رحلتك بسهولة وسرعة من خلال موقعنا الإلكتروني أو تطبيق
                  الهاتف المحمول
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <MapPinIcon className="h-12 w-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3 rtl-text">
                  تتبع الرحلات
                </h3>
                <p className="text-gray-600 rtl-text">
                  تتبع رحلتك في الوقت الفعلي ومعرفة موقع الحافلة والوقت المتوقع
                  للوصول
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <CreditCardIcon className="h-12 w-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3 rtl-text">
                  الدفع الإلكتروني
                </h3>
                <p className="text-gray-600 rtl-text">
                  دفع آمن ومريح عبر البطاقات الائتمانية أو المحافظ الإلكترونية
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <UserGroupIcon className="h-12 w-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3 rtl-text">
                  خدمة العملاء
                </h3>
                <p className="text-gray-600 rtl-text">
                  فريق خدمة عملاء متخصص متاح على مدار الساعة لمساعدتك في أي
                  استفسار
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <ShieldCheckIcon className="h-12 w-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3 rtl-text">
                  تأمين شامل
                </h3>
                <p className="text-gray-600 rtl-text">
                  تأمين شامل لجميع الركاب والممتلكات الشخصية ضد أي حوادث
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <ClockIcon className="h-12 w-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3 rtl-text">
                  برنامج الولاء
                </h3>
                <p className="text-gray-600 rtl-text">
                  برنامج نقاط وولاء يمنحك مزايا خاصة وخصومات على الرحلات
                  المستقبلية
                </p>
              </div>
            </div>
          </div>
        );

      case "terms":
        return (
          <div className="space-y-8 rtl-container">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4 rtl-text">
                الشروط والأحكام
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto rtl-text">
                يرجى قراءة هذه الشروط والأحكام بعناية قبل استخدام خدماتنا
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md space-y-6 rtl-text">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3 rtl-text">
                  1. شروط الحجز
                </h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2 rtl-text">
                  <li>يجب أن يكون عمر المسافر 18 عاماً أو أكثر للحجز</li>
                  <li>الحجز مطلوب قبل 24 ساعة على الأقل من موعد الرحلة</li>
                  <li>يجب إحضار وثيقة هوية صالحة عند السفر</li>
                  <li>الحجز غير قابل للتحويل لشخص آخر</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3 rtl-text">
                  2. سياسة الإلغاء
                </h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2 rtl-text">
                  <li>يمكن إلغاء الحجز قبل 24 ساعة من موعد الرحلة</li>
                  <li>رسوم الإلغاء: 10% من قيمة التذكرة</li>
                  <li>لا يمكن إلغاء الحجز خلال 24 ساعة من موعد الرحلة</li>
                  <li>
                    في حالة إلغاء الرحلة من قبل الشركة، سيتم استرداد المبلغ
                    بالكامل
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3 rtl-text">
                  3. قواعد السفر
                </h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2 rtl-text">
                  <li>يجب الوصول قبل 30 دقيقة من موعد الرحلة</li>
                  <li>ممنوع التدخين في الحافلات</li>
                  <li>يجب ربط حزام الأمان أثناء الرحلة</li>
                  <li>ممنوع إحضار الحيوانات الأليفة</li>
                  <li>الحد الأقصى للأمتعة: 20 كجم للشخص الواحد</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3 rtl-text">
                  4. المسؤولية
                </h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2 rtl-text">
                  <li>الشركة غير مسؤولة عن تأخير الرحلة بسبب الظروف الجوية</li>
                  <li>المسافر مسؤول عن أمتعته الشخصية</li>
                  <li>الشركة غير مسؤولة عن فقدان أو تلف الأمتعة</li>
                  <li>في حالة الحوادث، سيتم تطبيق التأمين المطبق</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-8 rtl-container">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4 rtl-text">
                سياسة الخصوصية
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto rtl-text">
                نحن نلتزم بحماية خصوصية بياناتك الشخصية وضمان أمانها
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md space-y-6 rtl-text">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3 rtl-text">
                  جمع المعلومات
                </h3>
                <p className="text-gray-600 mb-3 rtl-text">
                  نجمع المعلومات التالية من عملائنا:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 rtl-text">
                  <li>الاسم الكامل وتاريخ الميلاد</li>
                  <li>رقم الهاتف وعنوان البريد الإلكتروني</li>
                  <li>رقم الهوية الوطنية أو جواز السفر</li>
                  <li>معلومات الدفع (مشفرة)</li>
                  <li>سجل الرحلات والحجوزات</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3 rtl-text">
                  استخدام المعلومات
                </h3>
                <p className="text-gray-600 mb-3 rtl-text">
                  نستخدم معلوماتك للأغراض التالية:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 rtl-text">
                  <li>معالجة الحجوزات والمدفوعات</li>
                  <li>التواصل معك بخصوص رحلاتك</li>
                  <li>تحسين خدماتنا وتجربة المستخدم</li>
                  <li>إرسال العروض والخصومات (بموافقتك)</li>
                  <li>الامتثال للقوانين والأنظمة المعمول بها</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3 rtl-text">
                  حماية البيانات
                </h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2 rtl-text">
                  <li>نستخدم تقنيات تشفير متقدمة لحماية بياناتك</li>
                  <li>نقوم بتحديث أنظمة الأمان بشكل دوري</li>
                  <li>
                    نحد من الوصول إلى البيانات الشخصية للموظفين المصرح لهم فقط
                  </li>
                  <li>نحتفظ بالبيانات لفترة محدودة فقط</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3 rtl-text">
                  حقوقك
                </h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2 rtl-text">
                  <li>الحق في الوصول إلى بياناتك الشخصية</li>
                  <li>الحق في تصحيح البيانات غير الدقيقة</li>
                  <li>الحق في حذف بياناتك الشخصية</li>
                  <li>الحق في الاعتراض على معالجة بياناتك</li>
                  <li>الحق في سحب الموافقة في أي وقت</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3 rtl-text">
                  التواصل معنا
                </h3>
                <p className="text-gray-600 rtl-text">
                  إذا كان لديك أي استفسارات حول سياسة الخصوصية، يمكنك التواصل
                  معنا عبر:
                </p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center text-gray-600 justify-end">
                    <span className="rtl-text">privacy@rehlati-bus.com</span>
                    <EnvelopeIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 text-primary-600" />
                  </div>
                  <div className="flex items-center text-gray-600 justify-end">
                    <span className="rtl-text">+963 11 123 4567</span>
                    <PhoneIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 text-primary-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "faq":
        return (
          <div className="space-y-8 rtl-container">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4 rtl-text">
                الأسئلة الشائعة
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto rtl-text">
                إجابات على أكثر الأسئلة شيوعاً من عملائنا الكرام
              </p>
            </div>

            <div className="space-y-4">
              {faqData.map((faq) => (
                <div key={faq.id} className="bg-white rounded-lg shadow-md">
                  <button
                    className="w-full px-6 py-4 text-right flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                    onClick={() =>
                      setOpenFaq(openFaq === faq.id ? null : faq.id)
                    }
                  >
                    <span className="text-lg font-semibold text-gray-900 rtl-text">
                      {faq.question}
                    </span>
                    {openFaq === faq.id ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  {openFaq === faq.id && (
                    <div className="px-6 pb-4 rtl-text">
                      <p className="text-gray-600 leading-relaxed rtl-text">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col rtl-container">
      <Header />

      <main className="flex-1">
        {/* Navigation Tabs */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-center space-x-1 rtl:space-x-reverse">
              {[
                { id: "about", label: "عن الشركة" },
                { id: "services", label: "خدماتنا" },
                { id: "terms", label: "الشروط والأحكام" },
                { id: "privacy", label: "سياسة الخصوصية" },
                { id: "faq", label: "الأسئلة الشائعة" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleSectionChange(tab.id)}
                  className={`px-4 py-3 text-sm font-medium rounded-md transition-colors duration-200 rtl-text ${
                    activeSection === tab.id
                      ? "bg-primary-600 text-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {renderSection()}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
