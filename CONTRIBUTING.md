# Contributing to Bus Booking System

Thank you for your interest in contributing to our Bus Booking System! This document provides guidelines and information for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)
- [Documentation](#documentation)

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **MongoDB** (version 6.0 or higher)
- **Git**
- **npm** or **yarn**

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/bus-booking-system.git
   cd bus-booking-system
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/bus-booking-system.git
   ```

## Development Setup

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** in `.env`:
   ```env
   NODE_ENV=development
   PORT=5001
   MONGODB_URI=mongodb://localhost:27017/bus_booking_dev
   JWT_SECRET=your_development_jwt_secret
   JWT_EXPIRE=30d
   JWT_COOKIE_EXPIRE=30
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd user-front
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm start
   ```

### Database Setup

1. **Run migrations**:
   ```bash
   cd backend
   npm run migrate
   ```

2. **Seed test data** (optional):
   ```bash
   node scripts/seed_all_models.js
   ```

## Code Style Guidelines

### JavaScript/Node.js

We follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) with some modifications:

- **Indentation**: 2 spaces
- **Semicolons**: Required
- **Quotes**: Single quotes for strings
- **Trailing commas**: Required in objects and arrays

### React/JSX

- **Component naming**: PascalCase
- **File naming**: PascalCase for components, camelCase for utilities
- **Props destructuring**: Use destructuring in function parameters
- **Hooks**: Follow React Hooks rules and conventions

### Example Code Style

```javascript
// Good
const UserProfile = ({ user, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async (data) => {
    setIsLoading(true);
    try {
      await onUpdate(data);
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onUpdate]);

  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      {/* Component content */}
    </div>
  );
};

// Bad
const userProfile = (props) => {
  const [loading, setLoading] = useState(false);
  
  const submit = async (data) => {
    setLoading(true);
    try {
      await props.onUpdate(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return <div>{/* content */}</div>;
};
```

### File Organization

```
src/
├── components/          # Reusable components
│   ├── common/         # Shared components
│   ├── forms/          # Form components
│   └── layout/         # Layout components
├── pages/              # Page components
├── hooks/              # Custom hooks
├── utils/              # Utility functions
├── services/           # API services
└── styles/             # CSS/SCSS files
```

## Testing Guidelines

### Backend Testing

We use **Mocha** and **Chai** for backend testing:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Frontend Testing

We use **Jest** and **React Testing Library**:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Test Writing Guidelines

- **Test naming**: Descriptive test names that explain the behavior
- **Test structure**: Follow AAA pattern (Arrange, Act, Assert)
- **Test isolation**: Each test should be independent
- **Mocking**: Mock external dependencies appropriately

```javascript
// Good test example
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };
      
      // Act
      const result = await UserService.createUser(userData);
      
      // Assert
      expect(result).to.have.property('id');
      expect(result.name).to.equal(userData.name);
      expect(result.email).to.equal(userData.email);
    });

    it('should throw error for invalid email', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'password123',
      };
      
      // Act & Assert
      await expect(UserService.createUser(userData))
        .to.be.rejectedWith('Invalid email format');
    });
  });
});
```

## Pull Request Process

### Before Submitting

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code style guidelines

3. **Write tests** for new functionality

4. **Update documentation** if needed

5. **Test your changes**:
   ```bash
   # Backend
   cd backend && npm test
   
   # Frontend
   cd user-front && npm test
   ```

6. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add user profile management"
   ```

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(auth): add JWT token refresh functionality
fix(booking): resolve seat selection race condition
docs(api): update authentication endpoint documentation
test(user): add unit tests for user validation
```

### Submitting the PR

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub

3. **Fill out the PR template** with:
   - Description of changes
   - Related issue number
   - Testing instructions
   - Screenshots (if UI changes)

4. **Request review** from maintainers

### PR Review Process

- **Code review**: At least one maintainer must approve
- **CI/CD checks**: All tests must pass
- **Documentation**: Ensure documentation is updated
- **Security**: Security review for sensitive changes

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

1. **Clear description** of the bug
2. **Steps to reproduce**
3. **Expected behavior**
4. **Actual behavior**
5. **Environment details**:
   - OS and version
   - Browser and version (if frontend)
   - Node.js version
   - MongoDB version
6. **Screenshots** (if applicable)
7. **Console logs** (if applicable)

### Issue Template

```markdown
## Bug Description
[Clear description of the bug]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- OS: [e.g., Windows 10, macOS 12.0]
- Browser: [e.g., Chrome 96.0.4664.110]
- Node.js: [e.g., 18.0.0]
- MongoDB: [e.g., 6.0.0]

## Additional Information
[Screenshots, logs, etc.]
```

## Feature Requests

When requesting features:

1. **Describe the feature** clearly
2. **Explain the use case** and benefits
3. **Provide examples** if possible
4. **Consider implementation** complexity
5. **Check existing issues** for duplicates

## Documentation

### Code Documentation

- **JSDoc comments** for functions and classes
- **README files** for complex modules
- **Inline comments** for complex logic
- **API documentation** for endpoints

### Example Documentation

```javascript
/**
 * Creates a new booking for a trip
 * @param {Object} bookingData - The booking information
 * @param {string} bookingData.tripId - The trip ID
 * @param {string} bookingData.userId - The user ID
 * @param {Array<number>} bookingData.seats - Array of seat numbers
 * @param {Object} bookingData.paymentInfo - Payment information
 * @returns {Promise<Object>} The created booking object
 * @throws {Error} When booking validation fails
 */
async function createBooking(bookingData) {
  // Implementation
}
```

## Getting Help

If you need help:

1. **Check existing issues** and documentation
2. **Ask in discussions** on GitHub
3. **Join our community** (if available)
4. **Contact maintainers** directly

## Recognition

Contributors will be recognized in:

- **README.md** contributors section
- **Release notes** for significant contributions
- **GitHub contributors** page

Thank you for contributing to the Bus Booking System! 🚌 