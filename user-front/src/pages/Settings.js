import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const Settings = () => {
  const { user, setError: setAuthError, logout } = useAuth();
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    gender: "",
    age: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [creditCards, setCreditCards] = useState([]);
  const [newCardData, setNewCardData] = useState({
    cardNumber: "",
    cardHolderName: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    isDefault: false,
  });
  const [newCardFieldErrors, setNewCardFieldErrors] = useState({});

  const [loading, setLoading] = useState(true);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [cardError, setCardError] = useState("");
  const [cardSuccess, setCardSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // For general form field errors

  const fetchCreditCards = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setCardError("Not authenticated");
        return;
      }

      const res = await axios.get(
        "http://localhost:5001/api/user/Show-credit-cards",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        setCreditCards(res.data.data);
      } else {
        throw new Error(res.data.message || "Failed to fetch credit cards");
      }
    } catch (err) {
      console.error("Fetch credit cards error:", err);
      const errorMessage = err.response?.data?.message || "فشل في جلب البطاقات الائتمانية";
      setCardError(errorMessage);
      
      // If it's a duplicate card error, show a more specific message
      if (errorMessage.includes('duplicate') || errorMessage.includes('موجود مسبقاً')) {
        setCardError("هذه البطاقة مسجلة مسبقاً في حسابك");
      }
    }
  };

  // Fetch credit cards on component mount
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (user?._id) {
        try {
          await fetchCreditCards();
          if (isMounted) {
            setLoading(false);
          }
          
          // Only set up interval after initial fetch
          const intervalId = setInterval(() => {
            if (isMounted) {
              fetchCreditCards();
            }
          }, 30000);
          
          return () => clearInterval(intervalId);
        } catch (error) {
          console.error('Error in credit card interval:', error);
          if (isMounted) {
            setLoading(false);
          }
        }
      } else if (isMounted) {
        setLoading(false);
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [user?._id]);

  // Fetch user profile and credit cards on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        // Fetch profile
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }
        const profileRes = await axios.get(
          "http://localhost:5001/api/user/Show-profile",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setProfileData(profileRes.data.data);

        // Fetch credit cards
        const cardsRes = await axios.get(
          "http://localhost:5001/api/user/Show-credit-cards",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log(
          "Settings: Raw credit cards response data:",
          cardsRes.data.data
        );
        setCreditCards(cardsRes.data.data);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setProfileError("Failed to load user data.");
        setAuthError(
          err.response?.data?.message ||
            "Failed to authenticate. Please log in again."
        );
        logout(); // Log out if authentication fails
      } finally {
        setIsAddingCard(false);
        setIsRefreshing(false); // Ensure refresh overlay is hidden when done
        // Clear success message after 5 seconds
        if (cardSuccess) {
          setTimeout(() => {
            setCardSuccess("");
          }, 5000);
        }
      }
    };

    fetchUserData();
  }, [user, setAuthError, logout]);

  // Handle profile form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle password form changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle new credit card form changes
  const handleNewCardChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Format credit card number with spaces every 4 digits
    if (name === 'cardNumber') {
      // Remove all non-digits and limit to 16 characters
      const cleaned = value.replace(/\D/g, '').slice(0, 16);
      // Add space after every 4 digits
      const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
      setNewCardData(prev => ({
        ...prev,
        [name]: formatted
      }));
      return;
    }
    
    // Format CVV to only allow 3 digits
    if (name === 'cvv') {
      const cleaned = value.replace(/\D/g, '').slice(0, 3);
      setNewCardData(prev => ({
        ...prev,
        [name]: cleaned
      }));
      return;
    }
    
    // Handle other fields normally
    setNewCardData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle profile update submission
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setFieldErrors({}); // Clear field-specific errors
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await axios.put(
        "http://localhost:5001/api/user/Edit-profile",
        profileData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setProfileSuccess(res.data.message || "Profile updated successfully!");
    } catch (err) {
      console.error("Profile update error:", err);
      if (err.response?.data?.errors) {
        const errorsObj = {};
        err.response.data.errors.forEach((e) => {
          errorsObj[e.param] = e.msg; // Express-validator uses 'param' for field name
        });
        setFieldErrors(errorsObj);
        setProfileError(
          err.response.data.message || "Please correct the highlighted fields."
        );
      } else {
        setProfileError(
          err.response?.data?.message || "Failed to update profile."
        );
      }
    }
  };

  // Handle password update submission
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await axios.put(
        "http://localhost:5001/api/user/Edit-profile",
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setPasswordSuccess(res.data.message || "Password updated successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      }); // Clear form
    } catch (err) {
      console.error("Password update error:", err);
      setPasswordError(
        err.response?.data?.message || "Failed to update password."
      );
    }
  };

  // Handle adding a new credit card
  const handleAddCard = async (e) => {
    e.preventDefault();
    setCardError("");
    setCardSuccess("");
    setNewCardFieldErrors({});
    setIsAddingCard(true);
    
    // Clear any existing timeouts to prevent memory leaks
    if (window.refreshTimeout) {
      clearTimeout(window.refreshTimeout);
    }

    try {
      // Format data for validation and submission
      const cardNumberDigits = newCardData.cardNumber.replace(/\s/g, '');
      const expiryYearFull = newCardData.expiryYear.length === 2 
        ? `20${newCardData.expiryYear}` 
        : newCardData.expiryYear;
      
      // Generate a unique identifier for the card using last 4 digits and expiry
      const cardIdentifier = `${cardNumberDigits.slice(-4)}-${newCardData.expiryMonth}-${expiryYearFull}`;
      
      // Check if card already exists
      const cardExists = creditCards.some(card => 
        card.cardIdentifier === cardIdentifier ||
        (card.last4 === cardNumberDigits.slice(-4) && 
         card.expiryMonth === newCardData.expiryMonth && 
         card.expiryYear === expiryYearFull)
      );
      
      if (cardExists) {
        setCardError("هذه البطاقة مسجلة مسبقاً");
        setIsAddingCard(false);
        return;
      }

      console.log("Starting credit card addition process");
      console.log("Form data:", {
        ...newCardData,
        cardNumber: "***" + cardNumberDigits.slice(-4),
        cvv: "***",
        expiryYear: expiryYearFull
      });

      const errors = {};
      
      // Validation
      if (!newCardData.cardNumber) {
        errors.cardNumber = "رقم البطاقة مطلوب.";
      } else if (cardNumberDigits.length !== 16) {
        errors.cardNumber = "رقم البطاقة يجب أن يكون 16 رقمًا.";
      }

      if (!newCardData.cardHolderName) {
        errors.cardHolderName = "اسم حامل البطاقة مطلوب.";
      }

      if (!newCardData.expiryMonth) {
        errors.expiryMonth = "شهر الانتهاء مطلوب.";
      } else if (!/^(0[1-9]|1[0-2])$/.test(newCardData.expiryMonth)) {
        errors.expiryMonth = "شهر الانتهاء غير صالح (MM).";
      }

      if (!newCardData.expiryYear) {
        errors.expiryYear = "سنة الانتهاء مطلوبة.";
      } else if (!/^[0-9]{2,4}$/.test(newCardData.expiryYear)) {
        errors.expiryYear = "سنة الانتهاء غير صالحة (YY أو YYYY).";
      } else {
        const currentYear = new Date().getFullYear();
        const inputYear =
          newCardData.expiryYear.length === 2
            ? parseInt(`20${newCardData.expiryYear}`, 10)
            : parseInt(newCardData.expiryYear, 10);
        if (inputYear < currentYear || inputYear > currentYear + 20) {
          errors.expiryYear = "سنة الانتهاء غير صالحة.";
        }
      }

      if (!newCardData.cvv) {
        errors.cvv = "رمز CVV مطلوب.";
      } else if (!/^[0-9]{3,4}$/.test(newCardData.cvv)) {
        errors.cvv = "رمز CVV غير صالح (3-4 أرقام).";
      }

      if (Object.keys(errors).length > 0) {
        console.log("Validation errors:", errors);
        setNewCardFieldErrors(errors);
        setCardError("الرجاء تصحيح الحقول المميزة.");
        setIsAddingCard(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        setCardError("يرجى تسجيل الدخول مرة أخرى");
        setIsAddingCard(false);
        return;
      }

      // Prepare the data to send to the backend
      const cardData = {
        cardNumber: cardNumberDigits, // Full card number without spaces
        cardHolderName: newCardData.cardHolderName,
        expiryMonth: newCardData.expiryMonth,
        expiryYear: expiryYearFull, // 4-digit year
        cvv: newCardData.cvv,
        isDefault: newCardData.isDefault || false,
        // Add last4 for frontend display
        last4: cardNumberDigits.slice(-4),
        // Add brand detection (you can enhance this)
        brand: 'other' // Default brand, can be detected based on card number
      };

      console.log("Sending request to add credit card", cardData);
      const res = await axios.post(
        "http://localhost:5001/api/user/Add-credit-card",
        cardData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log("Server response:", res.data);
      
      if (res.data.success) {
        // Show success message and enable refresh overlay
        setCardSuccess("تمت إضافة البطاقة بنجاح! سيتم تحديث الصفحة...");
        setIsRefreshing(true);

        // Show success message and refresh overlay
        setCardSuccess("بتم إضافة بطاقة الدفع....");
        setIsRefreshing(true);
        
        // Refresh the cards
        await fetchCreditCards();
        
        // Clear the form
        setNewCardData({
          cardNumber: "",
          cardHolderName: "",
          expiryMonth: "",
          expiryYear: "",
          cvv: "",
          isDefault: false,
        });
        
        // Hide the refresh overlay after 2 seconds
        window.refreshTimeout = setTimeout(() => {
          setIsRefreshing(false);
          setCardSuccess("");
        }, 2000);
      } else {
        throw new Error(res.data.message || "فشل في إضافة البطاقة الائتمانية");
      }
    } catch (error) {
      console.error("Error adding credit card:", error);
      const errorMessage =
        error.response?.data?.message ||
        "فشل في إضافة البطاقة الائتمانية. يرجى المحاولة مرة أخرى.";
      if (errorMessage.includes("duplicate")) {
        setCardError("هذه البطاقة مسجلة مسبقاً.");
      } else {
        setCardError(errorMessage);
      }
      setIsRefreshing(false); // Ensure refresh overlay is hidden on error
      setCardSuccess(""); // Clear any success message
    } finally {
      // isAddingCard will be set to false after the page reloads,
      // but we set it here for cases where the reload doesn't happen (e.g., error).
      setIsAddingCard(false);
    }  
  };

  // Handle removing a credit card
  const handleRemoveCard = async (cardId) => {
    setCardError("");
    setCardSuccess("");

    // Add validation for cardId
    if (!cardId) {
      setCardError("Invalid card ID. Please try again.");
      return;
    }

    if (window.confirm("Are you sure you want to remove this credit card?")) {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setCardError("Authentication token not found. Please log in again.");
          setLoading(false);
          return;
        }

        const res = await axios.delete(
          `http://localhost:5001/api/user/delete-credit-card/${cardId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.data.success) {
          setCardSuccess(
            res.data.message || "Credit card removed successfully!"
          );
          setCreditCards((prev) => prev.filter((card) => card._id !== cardId));
        } else {
          setCardError(res.data.message || "Failed to remove credit card.");
        }
      } catch (err) {
        console.error("Remove card error:", err);
        const errorMessage =
          err.response?.data?.message ||
          (err.response?.status === 404
            ? "Credit card not found."
            : err.response?.status === 403
            ? "You don't have permission to remove this card."
            : "Failed to remove credit card. Please try again.");
        setCardError(errorMessage);
      }
    }
  };

  // Handle setting default payment method
  const handleSetDefaultCard = async (cardId) => {
    setCardError("");
    setCardSuccess("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await axios.put(
        `http://localhost:5001/api/user/Set-default-card/${cardId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setCardSuccess(res.data.message || "Default payment method updated!");
      // Update local state to reflect new default
      setCreditCards((prev) =>
        prev.map((card) => ({
          ...card,
          isDefault: card._id === cardId,
        }))
      );
    } catch (err) {
      console.error("Set default card error:", err);
      setCardError(
        err.response?.data?.message || "Failed to set default credit card."
      );
    }
  }

  // Show refreshing overlay
  if (isRefreshing) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white"></div>
        <p className="text-white text-lg mt-4 rtl:font-sans">{cardSuccess || "يتم تحديث الصفحة..."}</p>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <div className="w-full bg-[#18587A] py-4 text-center text-white text-2xl font-bold rtl:font-sans">
          الإعدادات
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-700">
          الرجاء تسجيل الدخول لعرض الإعدادات.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />
      <div className="w-full bg-[#18587A] py-4 text-center text-white text-2xl font-bold rtl:font-sans">
        الإعدادات
      </div>
      <div className="w-full p-4 md:p-8 flex-1">
        <div className="w-full bg-white rounded-lg shadow-md p-6 space-y-8">
          {/* Account Information Section */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4 rtl:font-sans text-right">
              معلومات الحساب
            </h2>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                  >
                    الاسم الأول
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    id="firstName"
                    className={`input-field text-right rtl:text-right ${
                      fieldErrors.firstName ? "border-red-500" : ""
                    }`}
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                  />
                  {fieldErrors.firstName && (
                    <p className="text-red-500 text-xs mt-1 text-right">
                      {fieldErrors.firstName}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                  >
                    اسم العائلة
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    id="lastName"
                    className={`input-field text-right rtl:text-right ${
                      fieldErrors.lastName ? "border-red-500" : ""
                    }`}
                    value={profileData.lastName}
                    onChange={handleProfileChange}
                  />
                  {fieldErrors.lastName && (
                    <p className="text-red-500 text-xs mt-1 text-right">
                      {fieldErrors.lastName}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                  >
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    className={`input-field text-right rtl:text-right ${
                      fieldErrors.email ? "border-red-500" : ""
                    }`}
                    value={profileData.email}
                    onChange={handleProfileChange}
                  />
                  {fieldErrors.email && (
                    <p className="text-red-500 text-xs mt-1 text-right">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                  >
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    className={`input-field text-right rtl:text-right ${
                      fieldErrors.phone ? "border-red-500" : ""
                    }`}
                    value={profileData.phone}
                    onChange={handleProfileChange}
                  />
                  {fieldErrors.phone && (
                    <p className="text-red-500 text-xs mt-1 text-right">
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="country"
                    className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                  >
                    البلد
                  </label>
                  <input
                    type="text"
                    name="country"
                    id="country"
                    className={`input-field text-right rtl:text-right ${
                      fieldErrors.country ? "border-red-500" : ""
                    }`}
                    value={profileData.country}
                    onChange={handleProfileChange}
                  />
                  {fieldErrors.country && (
                    <p className="text-red-500 text-xs mt-1 text-right">
                      {fieldErrors.country}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="age"
                    className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                  >
                    العمر
                  </label>
                  <input
                    type="number"
                    name="age"
                    id="age"
                    className={`input-field text-right rtl:text-right ${
                      fieldErrors.age ? "border-red-500" : ""
                    }`}
                    value={profileData.age}
                    onChange={handleProfileChange}
                  />
                  {fieldErrors.age && (
                    <p className="text-red-500 text-xs mt-1 text-right">
                      {fieldErrors.age}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="gender"
                    className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                  >
                    الجنس
                  </label>
                  <select
                    name="gender"
                    id="gender"
                    className={`input-field text-right rtl:text-right ${
                      fieldErrors.gender ? "border-red-500" : ""
                    }`}
                    value={profileData.gender}
                    onChange={handleProfileChange}
                  >
                    <option value="">اختر الجنس</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                  {fieldErrors.gender && (
                    <p className="text-red-500 text-xs mt-1 text-right">
                      {fieldErrors.gender}
                    </p>
                  )}
                </div>
              </div>
              {profileError && (
                <p className="text-red-500 text-center mt-4">{profileError}</p>
              )}
              {profileSuccess && (
                <p className="text-green-500 text-center mt-4">{profileSuccess}</p>
              )}
              <div className="flex justify-end mt-4">
                <button
                  type="submit"
                  className="btn-primary py-2 px-6 rounded-md text-sm"
                >
                  حفظ التغييرات
                </button>
              </div>
            </form>
          </section>

          <hr className="border-gray-200 my-8" />

          {/* Change Password Section */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4 rtl:font-sans text-right">
              تغيير كلمة المرور
            </h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                  >
                    كلمة المرور الحالية
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    id="currentPassword"
                    className="input-field text-right rtl:text-right"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  {/* Empty div for layout purposes */}
                </div>
                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                  >
                    كلمة المرور الجديدة
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    id="newPassword"
                    className="input-field text-right rtl:text-right"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirmNewPassword"
                    className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                  >
                    تأكيد كلمة المرور الجديدة
                  </label>
                  <input
                    type="password"
                    name="confirmNewPassword"
                    id="confirmNewPassword"
                    className="input-field text-right rtl:text-right"
                    value={passwordData.confirmNewPassword}
                    onChange={handlePasswordChange}
                    minLength={6}
                    required
                  />
                </div>
              </div>
              {passwordError && (
                <p className="text-red-500 text-center mt-2">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-green-500 text-center mt-2">{passwordSuccess}</p>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="btn-primary py-2 px-6 rounded-md text-sm"
                >
                  تغيير كلمة المرور
                </button>
              </div>
            </form>
          </section>

          <hr className="border-gray-200 my-8" />

          {/* Credit Card Management Section */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4 rtl:font-sans text-right">
              إدارة البطاقات الائتمانية
            </h2>
            {console.log(
              "Settings: Credit cards array for rendering:",
              JSON.stringify(creditCards, null, 2)
            )}
            {creditCards.length === 0 ? (
              <p className="text-gray-500 text-right">
                لا توجد بطاقات ائتمانية محفوظة.
              </p>
            ) : (
              creditCards.map((card) => (
                <div
                  key={card._id}
                  className={`bg-white p-4 rounded-lg shadow-md mb-4 flex justify-between items-center ${
                    card.isDefault ? "border-2 border-blue-500" : ""
                  }`}
                >
                  <div className="flex-grow">
                    <p className="font-semibold text-gray-800 text-right">
                      {card.cardHolderName}
                    </p>
                    <p className="text-gray-600 text-right">
                      •••• •••• •••• {card.last4 || '••••'}
                    </p>
                    <p className="text-sm text-gray-500 text-right">
                      تنتهي: {card.expiryMonth}/{card.expiryYear}
                    </p>
                    {card.balance !== undefined && (
                      <p className="text-sm font-medium text-primary-600 mt-1 text-right">
                        الرصيد: {card.balance.toLocaleString()} ل.س
                      </p>
                    )}
                    {card.isDefault && (
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-2">
                        بطاقة افتراضية
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!card.isDefault && (
                      <button
                        onClick={() => {
                          console.log("Setting default card:", card);
                          handleSetDefaultCard(card._id);
                        }}
                        className="btn-primary py-1 px-3 text-sm"
                      >
                        تعيين كافتراضية
                      </button>
                    )}
                    <button
                      onClick={() => {
                        console.log("Removing card:", card);
                        handleRemoveCard(card._id);
                      }}
                      className="bg-red-500 text-white py-1 px-3 rounded-md hover:bg-red-600 text-sm"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))
            )}

            <h3 className="text-lg font-bold text-gray-800 mt-8 mb-4 rtl:font-sans text-right">
              إضافة بطاقة ائتمانية جديدة
            </h3>
            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label
                  htmlFor="newCardNumber"
                  className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                >
                  رقم البطاقة
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9\s]{13,19}"
                  name="cardNumber"
                  id="newCardNumber"
                  placeholder="1234 5678 9012 3456"
                  className={`input-field text-right rtl:text-right ${
                    newCardFieldErrors.cardNumber ? "border-red-500" : ""
                  }`}
                  value={newCardData.cardNumber}
                  onChange={handleNewCardChange}
                  maxLength={19} // 16 digits + 3 spaces
                />
                {newCardFieldErrors.cardNumber && (
                  <p className="text-red-500 text-xs mt-1 text-right">
                    {newCardFieldErrors.cardNumber}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1 text-right">
                  أدخل 16 رقم البطاقة
                </p>
              </div>
              <div>
                <label
                  htmlFor="newCardHolderName"
                  className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                >
                  اسم حامل البطاقة
                </label>
                <input
                  type="text"
                  name="cardHolderName"
                  id="newCardHolderName"
                  className={`input-field text-right rtl:text-right ${
                    newCardFieldErrors.cardHolderName ? "border-red-500" : ""
                  }`}
                  value={newCardData.cardHolderName}
                  onChange={handleNewCardChange}
                />
                {newCardFieldErrors.cardHolderName && (
                  <p className="text-red-500 text-xs mt-1 text-right">
                    {newCardFieldErrors.cardHolderName}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="newExpiryMonth"
                    className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                  >
                    شهر الانتهاء
                  </label>
                  <select
                    name="expiryMonth"
                    id="newExpiryMonth"
                    className={`input-field text-right rtl:text-right ${
                      newCardFieldErrors.expiryMonth ? "border-red-500" : ""
                    }`}
                    value={newCardData.expiryMonth}
                    onChange={handleNewCardChange}
                  >
                    <option value="">الشهر</option>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = (i + 1).toString().padStart(2, '0');
                      return (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      );
                    })}
                  </select>
                  {newCardFieldErrors.expiryMonth && (
                    <p className="text-red-500 text-xs mt-1 text-right">
                      {newCardFieldErrors.expiryMonth}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="newExpiryYear"
                    className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                  >
                    سنة الانتهاء
                  </label>
                  <select
                    name="expiryYear"
                    id="newExpiryYear"
                    className={`input-field text-right rtl:text-right ${
                      newCardFieldErrors.expiryYear ? "border-red-500" : ""
                    }`}
                    value={newCardData.expiryYear}
                    onChange={handleNewCardChange}
                  >
                    <option value="">السنة</option>
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = (new Date().getFullYear() + i).toString().slice(-2);
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                  {newCardFieldErrors.expiryYear && (
                    <p className="text-red-500 text-xs mt-1 text-right">
                      {newCardFieldErrors.expiryYear}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="newCvv"
                    className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                  >
                    CVV
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{3}"
                    name="cvv"
                    id="newCvv"
                    placeholder="123"
                    className={`input-field text-right rtl:text-right ${
                      newCardFieldErrors.cvv ? "border-red-500" : ""
                    }`}
                    value={newCardData.cvv}
                    onChange={handleNewCardChange}
                    maxLength={3}
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    3 أرقام خلف البطاقة
                  </p>
                  {newCardFieldErrors.cvv && (
                    <p className="text-red-500 text-xs mt-1 text-right">
                      {newCardFieldErrors.cvv}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end rtl:flex-row-reverse">
                <label
                  htmlFor="isDefault"
                  className="text-sm font-medium text-gray-700 mr-2 rtl:ml-2 cursor-pointer"
                >
                  تعيين كبطاقة افتراضية
                </label>
                <input
                  type="checkbox"
                  name="isDefault"
                  id="isDefault"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  checked={newCardData.isDefault}
                  onChange={handleNewCardChange}
                />
              </div>
              {cardError && (
                <p className="text-red-500 text-center mt-4">{cardError}</p>
              )}
              {cardSuccess && (
                <p className="text-green-600 text-center mt-4">{cardSuccess}</p>
              )}
              <button
                type="submit"
                className="btn-primary w-full py-2 px-4 rounded-md"
                disabled={isAddingCard}
              >
                {isAddingCard ? "جاري الإضافة..." : "إضافة البطاقة"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
