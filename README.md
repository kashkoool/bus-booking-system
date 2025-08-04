# 🚌 Multi-Company Bus Booking System

A comprehensive real-time bus booking platform that supports multiple transportation companies with advanced features including live seat tracking, instant notifications, and intelligent demand prediction. Built with React, Node.js, and Socket.IO.

![Bus Booking System](https://img.shields.io/badge/React-18.2.0-blue?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-8.14.1-green?style=for-the-badge&logo=mongodb)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.1-orange?style=for-the-badge&logo=socket.io)

## 📋 Table of Contents

- [Features](#-features)
- [Screenshots](#-screenshots)
- [Tech Stack](#-tech-stack)
- [Folder Structure](#-folder-structure)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [Real-Time Features](#-real-time-features)
- [Performance Optimizations](#-performance-optimizations)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🎯 Core Features
- **Multi-Company Support**: Independent operations for multiple transportation companies
- **Real-time Booking**: Live seat availability and instant booking confirmations
- **Multi-User System**: Admin, Manager, Staff, and Customer roles
- **Company Management**: Individual dashboards and branding for each company
- **Bus Management**: Complete bus fleet management system
- **Trip Scheduling**: Advanced trip planning and scheduling
- **Payment Integration**: Secure payment processing with credit card support
- **QR Code Generation**: Digital tickets with QR codes
- **Email Notifications**: Automated booking confirmations and updates

### 🔐 Authentication & Security
- JWT-based authentication
- Role-based access control (RBAC)
- Password encryption with bcrypt
- Session management
- API rate limiting

### 📊 Analytics & Reporting
- Real-time booking analytics
- Revenue reports and trends
- Trip performance metrics
- Company-wise statistics
- Demand prediction using AI

### 🎨 User Experience
- Responsive design with Tailwind CSS
- Modern UI/UX with smooth animations
- Real-time notifications
- Performance monitoring
- Error handling and recovery

## 📷 Screenshots

### Customer Interface
![Customer Dashboard](https://via.placeholder.com/800x400/4F46E5/FFFFFF?text=Customer+Dashboard)
*Modern customer dashboard with booking interface*

### Admin Panel
![Admin Dashboard](https://via.placeholder.com/800x400/059669/FFFFFF?text=Admin+Dashboard)
*Comprehensive admin panel with analytics*

### Manager Interface
![Manager Dashboard](https://via.placeholder.com/800x400/DC2626/FFFFFF?text=Manager+Dashboard)
*Manager dashboard with company management tools*

### Staff Interface
![Staff Dashboard](https://via.placeholder.com/800x400/7C3AED/FFFFFF?text=Staff+Dashboard)
*Staff interface for trip management*

## 🛠️ Tech Stack

### Frontend
- **React 18.2.0** - Modern UI framework
- **React Router DOM 6.24.0** - Client-side routing
- **Tailwind CSS 3.3.5** - Utility-first CSS framework
- **Framer Motion 12.18.1** - Animation library
- **Socket.IO Client 4.8.1** - Real-time communication
- **Axios 1.6.2** - HTTP client
- **Chart.js 4.4.3** - Data visualization
- **React Icons 5.5.0** - Icon library

### Backend
- **Node.js 18+** - JavaScript runtime
- **Express.js 5.1.0** - Web framework
- **MongoDB 8.14.1** - NoSQL database
- **Mongoose 8.14.1** - MongoDB ODM
- **Socket.IO 4.8.1** - Real-time server
- **JWT 9.0.2** - Authentication
- **bcrypt 5.1.1** - Password hashing
- **Multer 1.4.5** - File uploads
- **Nodemailer 6.10.1** - Email service
- **PDFKit 0.17.1** - PDF generation
- **QRCode 1.5.4** - QR code generation

### Development Tools
- **Nodemon** - Development server
- **ESLint** - Code linting
- **Mocha & Chai** - Testing framework
- **Webpack Bundle Analyzer** - Bundle analysis

## 📁 Folder Structure

```
bus-booking-system/
├── backend/                    # Node.js API server
│   ├── config/                # Database configuration
│   ├── controllers/           # Route controllers
│   ├── middleware/            # Custom middleware
│   ├── models/                # MongoDB schemas
│   ├── routes/                # API routes
│   ├── scripts/               # Database scripts
│   ├── tests/                 # Backend tests
│   ├── uploads/               # File uploads
│   ├── utils/                 # Utility functions
│   └── server.js              # Main server file
├── user-front/                # React frontend
│   ├── public/                # Static assets
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── context/           # React context
│   │   ├── hooks/             # Custom hooks
│   │   ├── layouts/           # Layout components
│   │   ├── pages/             # Page components
│   │   └── utils/             # Frontend utilities
│   └── package.json
├── docs/                      # Documentation
└── README.md                  # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB 6.0+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/bus-booking-system.git
   cd bus-booking-system
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../user-front
   npm install
   ```

4. **Environment Setup**

   Create `.env` file in `backend/` directory:
   ```env
   NODE_ENV=development
   PORT=5001
   MONGODB_URI=mongodb://localhost:27017/bus_booking
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=30d
   JWT_COOKIE_EXPIRE=30
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_password
   ```

5. **Start the development servers**

   Backend:
   ```bash
   cd backend
   npm run dev
   ```

   Frontend (in a new terminal):
   ```bash
   cd user-front
   npm start
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001

### Database Setup

1. **Run migrations**
   ```bash
   cd backend
   npm run migrate
   ```

2. **Seed initial data** (optional)
   ```bash
   node scripts/seed_all_models.js
   ```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Booking Endpoints
- `GET /api/bookings` - Get all bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking

### Trip Endpoints
- `GET /api/trips` - Get all trips
- `POST /api/trips` - Create new trip
- `GET /api/trips/:id` - Get trip details
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

### Company Endpoints
- `GET /api/companies` - Get all companies
- `POST /api/companies` - Create new company
- `GET /api/companies/:id` - Get company details
- `PUT /api/companies/:id` - Update company

For complete API documentation, see [backend/README.md](backend/README.md)

## ⚡ Real-Time Features

### Socket.IO Integration
- **Live Seat Updates**: Real-time seat availability
- **Booking Notifications**: Instant booking confirmations
- **Trip Status Updates**: Live trip status changes
- **Chat System**: Real-time communication between users

### Performance Optimizations
- **Connection Limits**: Optimized socket connections
- **Rate Limiting**: API request throttling
- **Caching**: Redis-like caching with node-cache
- **Bundle Optimization**: Webpack optimizations

## 🔧 Performance Optimizations

This project includes extensive performance optimizations:

- **API Call Reduction**: 80% reduction in unnecessary API calls
- **Component Memoization**: React.memo and useCallback usage
- **Socket Connection Management**: Optimized reconnection logic
- **Bundle Size Optimization**: Code splitting and lazy loading
- **Database Indexing**: Optimized MongoDB queries

For detailed performance improvements, see [PERFORMANCE_OPTIMIZATIONS.md](PERFORMANCE_OPTIMIZATIONS.md)

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage
```

### Frontend Tests
```bash
cd user-front
npm test                   # Run all tests
npm run build             # Build for production
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** for the amazing framework
- **Express.js** for the robust backend framework
- **MongoDB** for the flexible database
- **Socket.IO** for real-time capabilities
- **Tailwind CSS** for the utility-first styling

## 📞 Support

If you have any questions or need help:

- 📧 Email: loaekashkoool@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/kashkooo/bus-booking-system/issues)
- 📖 Documentation: [Wiki](https://github.com/kashkooo/bus-booking-system/wiki)

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/bus-booking-system&type=Date)](https://star-history.com/#yourusername/bus-booking-system&Date)

---

**Made with ❤️ by the Bus Booking System Team** 
