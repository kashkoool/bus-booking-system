import React from "react";
import { Link } from "react-router-dom";
import {
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ClockIcon,
  TruckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
      {/* Main Footer Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 mx-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <img
                src="/images/logo.png"
                alt="رحلتي-Bus Logo"
                className="h-20 w-auto"
              />
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              نقدم أفضل خدمات النقل والحجز عبر الإنترنت مع ضمان الراحة والأمان
              لجميع رحلاتك.
            </p>
            <div className="flex space-x-4 rtl:space-x-reverse">
              <a
                href="#"
                className="text-gray-400 hover:text-primary-600 transition-colors duration-200"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
                </svg>
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-primary-600 transition-colors duration-200"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-primary-600 transition-colors duration-200"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 rtl:font-sans flex items-center">
              <UserGroupIcon className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0 text-primary-600" />
              روابط سريعة
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/about?section=about"
                  className="text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm flex items-center"
                >
                  <span className="w-2 h-2 bg-primary-600 rounded-full mr-2 rtl:ml-2 rtl:mr-0"></span>
                  عن الشركة
                </Link>
              </li>
              <li>
                <Link
                  to="/about?section=services"
                  className="text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm flex items-center"
                >
                  <span className="w-2 h-2 bg-primary-600 rounded-full mr-2 rtl:ml-2 rtl:mr-0"></span>
                  خدماتنا
                </Link>
              </li>
              <li>
                <Link
                  to="/about?section=terms"
                  className="text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm flex items-center"
                >
                  <span className="w-2 h-2 bg-primary-600 rounded-full mr-2 rtl:ml-2 rtl:mr-0"></span>
                  الشروط والأحكام
                </Link>
              </li>
              <li>
                <Link
                  to="/about?section=privacy"
                  className="text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm flex items-center"
                >
                  <span className="w-2 h-2 bg-primary-600 rounded-full mr-2 rtl:ml-2 rtl:mr-0"></span>
                  سياسة الخصوصية
                </Link>
              </li>
              <li>
                <Link
                  to="/about?section=faq"
                  className="text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm flex items-center"
                >
                  <span className="w-2 h-2 bg-primary-600 rounded-full mr-2 rtl:ml-2 rtl:mr-0"></span>
                  الأسئلة الشائعة
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 rtl:font-sans flex items-center">
              <TruckIcon className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0 text-primary-600" />
              خدماتنا
            </h3>
            <ul className="space-y-2">
              <li className="text-gray-600 text-sm flex items-center">
                <span className="w-2 h-2 bg-primary-600 rounded-full mr-2 rtl:ml-2 rtl:mr-0"></span>
                حجز الرحلات
              </li>
              <li className="text-gray-600 text-sm flex items-center">
                <span className="w-2 h-2 bg-primary-600 rounded-full mr-2 rtl:ml-2 rtl:mr-0"></span>
                تتبع الرحلات
              </li>
              <li className="text-gray-600 text-sm flex items-center">
                <span className="w-2 h-2 bg-primary-600 rounded-full mr-2 rtl:ml-2 rtl:mr-0"></span>
                الدفع الإلكتروني
              </li>
              <li className="text-gray-600 text-sm flex items-center">
                <span className="w-2 h-2 bg-primary-600 rounded-full mr-2 rtl:ml-2 rtl:mr-0"></span>
                خدمة العملاء
              </li>
              <li className="text-gray-600 text-sm flex items-center">
                <span className="w-2 h-2 bg-primary-600 rounded-full mr-2 rtl:ml-2 rtl:mr-0"></span>
                برنامج الولاء
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 rtl:font-sans flex items-center">
              <EnvelopeIcon className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0 text-primary-600" />
              تواصل معنا
            </h3>
            <div className="space-y-3">
              <div className="flex items-center text-gray-600 text-sm">
                <PhoneIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 text-primary-600" />
                <span>+963 11 123 4567</span>
              </div>
              <div className="flex items-center text-gray-600 text-sm">
                <EnvelopeIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 text-primary-600" />
                <span>info@rehlati-bus.com</span>
              </div>
              <div className="flex items-center text-gray-600 text-sm">
                <MapPinIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 text-primary-600" />
                <span>دمشق، سوريا</span>
              </div>
              <div className="flex items-center text-gray-600 text-sm">
                <ClockIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 text-primary-600" />
                <span>24/7 خدمة العملاء</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="bg-primary-800 text-white py-6">
        <div className="w-full px-4 sm:px-6 lg:px-8 mx-0">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div></div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className=" text-sm">
                © 2025 رحلتي-Bus. جميع الحقوق محفوظة
              </span>
            </div>
            <div></div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
