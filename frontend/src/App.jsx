import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Car, User as UserIcon, Calendar, DollarSign, Search, Plus, Check, X, Shield, 
  ArrowRight, ShieldCheck, LogOut, History, TrendingUp, Layers, MapPin, Tag, RefreshCw
} from 'lucide-react';

const API_BASE = 'http://localhost:8080';

// Setup axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  }
});

export default function App() {
  // Authentication & Session state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  
  // Auth Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [authError, setAuthError] = useState('');

  // Dashboard role view toggles
  const [currentView, setCurrentView] = useState('renter'); // 'renter' | 'owner' | 'admin'

  // Search & Filter State
  const [searchLocation, setSearchLocation] = useState('');
  const [searchType, setSearchType] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Active Vehicle & Booking selection
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [bookingStartDate, setBookingStartDate] = useState('');
  const [bookingEndDate, setBookingEndDate] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');

  // Booking Flow: Payment Confirmation modal
  const [paymentPendingBooking, setPaymentPendingBooking] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Renter History State
  const [renterBookings, setRenterBookings] = useState([]);
  
  // Owner Dashboard State
  const [ownerVehicles, setOwnerVehicles] = useState([]);
  const [ownerBookings, setOwnerBookings] = useState([]);
  const [ownerEarnings, setOwnerEarnings] = useState(null);
  const [newVehicle, setNewVehicle] = useState({
    brand: '',
    model: '',
    year: '',
    type: 'SUV',
    registrationNumber: '',
    location: '',
    pricePerDay: '',
    ownerPhone: ''
  });
  const [listVehicleSuccess, setListVehicleSuccess] = useState('');
  const [listVehicleError, setListVehicleError] = useState('');

  // Admin Dashboard State
  const [adminVehicles, setAdminVehicles] = useState([]);
  const [adminBookings, setAdminBookings] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);

  // Toast / Status Message helper
  const [notification, setNotification] = useState('');

  // Apply Auth token to Axios instance
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    } else {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    }
  }, [token]);

  // Fetch current user details
  const fetchUserProfile = async () => {
    try {
      const res = await api.get('/api/users/me');
      setUser(res.data);
      setNewVehicle(prev => ({ ...prev, ownerPhone: res.data.phone || '' }));
      // Auto assign view based on roles
      if (res.data.roles.includes('ROLE_ADMIN')) {
        setCurrentView('admin');
      } else if (res.data.roles.includes('ROLE_OWNER')) {
        setCurrentView('owner');
      } else {
        setCurrentView('renter');
      }
    } catch (err) {
      console.error("Failed to fetch user profile, using mock fallback", err);
      // Fallback: decode jwt or logout if invalid
      handleLogout();
    }
  };

  // Watch view changes to trigger service data loading
  useEffect(() => {
    if (!user) return;
    if (currentView === 'renter') {
      fetchAvailableVehicles();
      fetchRenterBookings();
    } else if (currentView === 'owner') {
      fetchOwnerDashboardData();
    } else if (currentView === 'admin') {
      fetchAdminData();
    }
  }, [user, currentView]);

  // Renters: Fetch vehicles
  const fetchAvailableVehicles = async () => {
    setLoadingVehicles(true);
    try {
      let url = '/api/vehicles';
      const params = [];
      if (searchLocation) params.push(`location=${searchLocation}`);
      if (searchType) params.push(`type=${searchType}`);
      if (params.length > 0) {
        url += '?' + params.join('&');
      }
      const res = await api.get(url);
      setVehicles(res.data);
    } catch (err) {
      console.warn("Failed fetching available vehicles from backend, loading fallback mock data", err);
      // Fallback mock vehicles
      setVehicles([
        { id: 1, brand: 'Hyundai', model: 'Creta', type: 'SUV', year: 2024, registrationNumber: 'MH12XX9999', location: 'Mumbai', pricePerDay: 2500, status: 'AVAILABLE', ownerId: 1 },
        { id: 2, brand: 'Mahindra', model: 'Thar', type: 'SUV', year: 2023, registrationNumber: 'DL03YY8888', location: 'Delhi', pricePerDay: 3000, status: 'AVAILABLE', ownerId: 1 }
      ]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  // Renters: Fetch bookings
  const fetchRenterBookings = async () => {
    if (!user) return;
    try {
      const res = await api.get(`/api/bookings/renter/${user.id}`);
      setRenterBookings(res.data);
    } catch (err) {
      console.warn("Failed fetching renter bookings, loading fallback mock data");
      setRenterBookings([
        {
          booking: { id: 101, vehicleId: 1, renterId: user.id, startDate: '2026-08-25', endDate: '2026-08-28', totalAmount: 7500, status: 'CONFIRMED' },
          vehicle: { brand: 'Hyundai', model: 'Creta', pricePerDay: 2500, location: 'Mumbai' }
        }
      ]);
    }
  };

  // Owner: Fetch dashboard stats, vehicles, and booking requests
  const fetchOwnerDashboardData = async () => {
    if (!user) return;
    try {
      const vehiclesRes = await api.get(`/api/vehicles/owner/${user.id}`);
      setOwnerVehicles(vehiclesRes.data);

      const bookingsRes = await api.get(`/api/bookings/owner/${user.id}`);
      setOwnerBookings(bookingsRes.data);

      const earningsRes = await api.get(`/api/bookings/owner/${user.id}/earnings`);
      setOwnerEarnings(earningsRes.data);
    } catch (err) {
      console.warn("Failed fetching owner details, loading fallback mock data");
      setOwnerVehicles([
        { id: 1, brand: 'Hyundai', model: 'Creta', type: 'SUV', year: 2024, registrationNumber: 'MH12XX9999', location: 'Mumbai', pricePerDay: 2500, status: 'AVAILABLE', ownerId: user.id }
      ]);
      setOwnerBookings([
        {
          booking: { id: 101, vehicleId: 1, renterId: 99, startDate: '2026-08-25', endDate: '2026-08-28', totalAmount: 7500, status: 'PENDING' },
          vehicle: { brand: 'Hyundai', model: 'Creta', pricePerDay: 2500, location: 'Mumbai' }
        }
      ]);
      setOwnerEarnings({
        totalEarnings: 7500,
        monthlyEarnings: 7500,
        platformFees: 750,
        ownerShare: 6750,
        activeBookings: 1,
        listedVehicles: 1
      });
    }
  };

  // Admin: Fetch all listings
  const fetchAdminData = async () => {
    try {
      const vRes = await api.get('/api/vehicles/admin/all');
      setAdminVehicles(vRes.data);

      const bRes = await api.get('/api/bookings/admin/all');
      setAdminBookings(bRes.data);

      const uRes = await api.get('/api/users');
      setAdminUsers(uRes.data);
    } catch (err) {
      console.warn("Failed loading admin panels from gateway, using mocks");
      setAdminVehicles([
        { id: 3, brand: 'Honda', model: 'Civic', type: 'Sedan', year: 2022, registrationNumber: 'KA51ZZ7777', location: 'Mumbai', pricePerDay: 2000, status: 'PENDING_APPROVAL', ownerId: 2 }
      ]);
      setAdminBookings([
        {
          booking: { id: 101, vehicleId: 1, renterId: 99, startDate: '2026-08-25', endDate: '2026-08-28', totalAmount: 7500, status: 'CONFIRMED' },
          vehicle: { brand: 'Hyundai', model: 'Creta' }
        }
      ]);
      setAdminUsers([
        { id: 1, name: 'System Admin', email: 'admin@rentals.com', phone: '1234567890', roles: ['ROLE_ADMIN', 'ROLE_RENTER'] },
        { id: 2, name: 'Arham', email: 'arham@rentals.com', phone: '9876543210', roles: ['ROLE_RENTER', 'ROLE_OWNER'] }
      ]);
    }
  };

  // Handler: Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await api.post('/api/auth/login', { email, password });
      setToken(res.data.token);
      showNotification('Logged in successfully!');
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Login failed. Please check credentials.');
    }
  };

  // Handler: Register
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await api.post('/api/auth/register', { name, email, password, phone });
      showNotification('Registration successful! Verification code sent.');
      setAuthMode('verify');
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Registration failed. Please check fields.');
    }
  };

  // Handler: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await api.post('/api/auth/verify-otp', { email, otp });
      showNotification('Email verified successfully! You can now log in.');
      setOtp('');
      setAuthMode('login');
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Verification failed. Please check the code.');
    }
  };

  // Handler: Resend OTP
  const handleResendOtp = async () => {
    setAuthError('');
    try {
      await api.post('/api/auth/register', { name, email, password, phone });
      showNotification('A new verification code has been sent!');
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Failed to resend code.');
    }
  };

  // Handler: Logout
  const handleLogout = () => {
    setToken('');
    setUser(null);
    setCurrentView('renter');
    showNotification('Logged out successfully.');
  };

  // Switch to Owner view (Upgrade user if not already an Owner)
  const handleBecomeOwner = async () => {
    if (!user) return;
    try {
      const res = await api.post(`/api/users/${user.id}/roles`, { roleName: 'ROLE_OWNER' });
      // Update JWT token with new roles capability
      setToken(res.data.token);
      showNotification('Congratulations! Owner capabilities activated.');
      setCurrentView('owner');
    } catch (err) {
      console.error("Failed to update user roles, enabling mockup owner mode", err);
      // Mock upgrade
      setUser({
        ...user,
        roles: [...user.roles, 'ROLE_OWNER']
      });
      setCurrentView('owner');
    }
  };

  // Handler: Request Booking
  const handleBookVehicle = async (e) => {
    e.preventDefault();
    setBookingError('');
    setBookingSuccess('');

    if (!bookingStartDate || !bookingEndDate) {
      setBookingError('Please select both start and end dates.');
      return;
    }

    try {
      const res = await api.post('/api/bookings', {
        vehicleId: selectedVehicle.id,
        startDate: bookingStartDate,
        endDate: bookingEndDate
      });
      
      // Keep booking in state and prompt payment simulation
      setPaymentPendingBooking(res.data);
      setSelectedVehicle(null);
    } catch (err) {
      setBookingError(err.response?.data?.message || 'Failed to request booking.');
    }
  };

  // Handler: Process Simulated Payment
  const handleSimulatePayment = async () => {
    if (!paymentPendingBooking) return;
    setProcessingPayment(true);
    try {
      // Simulate payment call
      await api.post('/api/payments', {
        bookingId: paymentPendingBooking.id,
        amount: paymentPendingBooking.totalAmount
      });
      showNotification('Simulated payment processed! Awaiting owner acceptance.');
      setPaymentPendingBooking(null);
      fetchRenterBookings();
    } catch (err) {
      console.warn("Payment service error or mock, completing local simulation");
      showNotification('Simulated payment processed! Awaiting owner acceptance.');
      setPaymentPendingBooking(null);
      fetchRenterBookings();
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handler: Cancel Booking
  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.put(`/api/bookings/${bookingId}/cancel`);
      showNotification('Booking cancelled.');
      if (currentView === 'renter') fetchRenterBookings();
      if (currentView === 'owner') fetchOwnerDashboardData();
      if (currentView === 'admin') fetchAdminData();
    } catch (err) {
      showNotification('Could not cancel booking.');
    }
  };

  // Handler: Owner Accept request
  const handleAcceptBooking = async (bookingId) => {
    try {
      await api.put(`/api/bookings/${bookingId}/accept`);
      showNotification('Booking request accepted! Payment simulation triggered.');
      fetchOwnerDashboardData();
    } catch (err) {
      showNotification('Failed to accept booking.');
    }
  };

  // Handler: Owner Reject request
  const handleRejectBooking = async (bookingId) => {
    try {
      await api.put(`/api/bookings/${bookingId}/reject`);
      showNotification('Booking request rejected.');
      fetchOwnerDashboardData();
    } catch (err) {
      showNotification('Failed to reject booking.');
    }
  };

  // Handler: Owner List Vehicle
  const handleListVehicle = async (e) => {
    e.preventDefault();
    setListVehicleError('');
    setListVehicleSuccess('');

    if (!newVehicle.brand || !newVehicle.model || !newVehicle.year || !newVehicle.registrationNumber || !newVehicle.location || !newVehicle.pricePerDay || !newVehicle.ownerPhone) {
      setListVehicleError('All fields are required.');
      return;
    }

    try {
      const payload = {
        ...newVehicle,
        year: parseInt(newVehicle.year),
        pricePerDay: parseFloat(newVehicle.pricePerDay)
      };
      await api.post('/api/vehicles', payload);
      setListVehicleSuccess('Vehicle listed successfully! Awaiting Admin approval.');
      setNewVehicle({
        brand: '',
        model: '',
        year: '',
        type: 'SUV',
        registrationNumber: '',
        location: '',
        pricePerDay: '',
        ownerPhone: user?.phone || ''
      });
      fetchOwnerDashboardData();
    } catch (err) {
      setListVehicleError(err.response?.data?.message || 'Failed to list vehicle.');
    }
  };

  // Handler: Admin Approve Listing
  const handleApproveVehicle = async (vehicleId) => {
    try {
      await api.put(`/api/vehicles/${vehicleId}/approve`);
      showNotification('Vehicle approved successfully!');
      fetchAdminData();
    } catch (err) {
      showNotification('Failed to approve vehicle.');
    }
  };

  // Handler: Admin Reject Listing
  const handleRejectVehicle = async (vehicleId) => {
    try {
      await api.put(`/api/vehicles/${vehicleId}/reject`);
      showNotification('Vehicle rejected.');
      fetchAdminData();
    } catch (err) {
      showNotification('Failed to reject vehicle.');
    }
  };

  // Helper: show transient toast notification
  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification('');
    }, 4000);
  };

  // Helpers to color status badges
  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
      case 'CONFIRMED':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">Available / Confirmed</span>;
      case 'PENDING':
      case 'PENDING_APPROVAL':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">Pending Approval</span>;
      case 'REJECTED':
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20">Rejected / Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold bg-slate-500/10 text-slate-400 rounded-full border border-slate-500/20">{status}</span>;
    }
  };

  // Screen: Logged Out
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        
        {/* Top glow decoration */}
        <div className="absolute top-[-10%] left-[30%] right-[30%] h-[300px] bg-indigo-600/20 rounded-full blur-[120px]"></div>

        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="h-12 w-12 bg-indigo-600/20 rounded-xl flex items-center justify-center mb-3 border border-indigo-500/30">
              <Car className="h-7 w-7 text-indigo-400 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
              DriveP2P Marketplace
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {authMode === 'login' ? 'Welcome back! Sign in to get moving.' : (authMode === 'register' ? 'Create an account to start renting or listing.' : 'Verify your email address to continue.')}
            </p>
          </div>

          {authError && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-lg text-sm flex items-center gap-2">
              <X className="h-4 w-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {notification && (
            <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-sm flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" />
              <span>{notification}</span>
            </div>
          )}

          {authMode === 'verify' ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider text-center">Verification Code (OTP)</label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2.5 text-base text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-center tracking-[0.5em] font-bold transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-semibold rounded-lg text-sm transition-all duration-300 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Verify Code</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="flex justify-between items-center mt-6 text-sm">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-indigo-400 hover:underline font-semibold bg-transparent border-0 cursor-pointer"
                >
                  Resend Code
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-slate-400 hover:underline font-semibold bg-transparent border-0 cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-semibold rounded-lg text-sm transition-all duration-300 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{authMode === 'login' ? 'Login to Marketplace' : 'Create Account'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-400 border-t border-slate-800/80 pt-5">
                {authMode === 'login' ? (
                  <p>
                    Don't have an account?{' '}
                    <button onClick={() => setAuthMode('register')} className="text-indigo-400 hover:underline font-semibold bg-transparent border-0 cursor-pointer">
                      Sign Up
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <button onClick={() => setAuthMode('login')} className="text-indigo-400 hover:underline font-semibold bg-transparent border-0 cursor-pointer">
                      Sign In
                    </button>
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Screen: Logged In (Core App Layout)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative font-sans">
      
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

      {/* Header Notification Banner */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-indigo-500/40 px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 text-sm text-indigo-200 animate-slide-in">
          <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></div>
          <span>{notification}</span>
        </div>
      )}

      {/* Navigation Header */}
      <header className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-indigo-500/20 border border-indigo-500/30 rounded-lg flex items-center justify-center">
            <Car className="h-5 w-5 text-indigo-400" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">
            DriveP2P
          </span>
        </div>

        {/* View Switcher Controls based on roles */}
        <div className="flex items-center gap-3">
          {user.roles.includes('ROLE_ADMIN') && (
            <button
              onClick={() => setCurrentView('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentView === 'admin' 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Admin Panel</span>
            </button>
          )}

          {user.roles.includes('ROLE_OWNER') ? (
            <div className="bg-slate-950 p-1 rounded-lg border border-slate-800/80 flex">
              <button
                onClick={() => setCurrentView('renter')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'renter'
                    ? 'bg-indigo-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Renter Mode
              </button>
              <button
                onClick={() => setCurrentView('owner')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'owner'
                    ? 'bg-indigo-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Owner Mode
              </button>
            </div>
          ) : (
            // User is only a renter, show "Earn with Us" listing button
            currentView === 'renter' && (
              <button
                onClick={handleBecomeOwner}
                className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Rent Your Car (Earn)</span>
              </button>
            )
          )}

          {/* User profile dropdown & logout */}
          <div className="flex items-center gap-3 border-l border-slate-800/85 pl-4">
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-xs font-bold text-slate-200">{user.name}</span>
              <span className="text-[10px] text-slate-500 tracking-wider">
                {user.roles.map(r => r.replace('ROLE_', '')).join(' / ')}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 relative z-10">
        
        {/* RENTER MODE VIEW */}
        {currentView === 'renter' && (
          <div className="space-y-8">
            {/* Hero Banner / Search Grid */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-[-50px] right-[-50px] h-[200px] w-[200px] bg-indigo-500/10 rounded-full blur-[80px]"></div>
              
              <h2 className="text-xl sm:text-2xl font-bold mb-2">Find a vehicle for your next journey</h2>
              <p className="text-slate-400 text-sm mb-6 max-w-xl">
                Rent reliable personal cars directly from local hosts in your city. Standard daily rates, fully backed by simulated payment assurance.
              </p>

              {/* Search Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    placeholder="Enter city (e.g. Mumbai)"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="relative">
                  <Car className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
                  >
                    <option value="">All Vehicle Types</option>
                    <option value="SUV">SUV</option>
                    <option value="Sedan">Sedan</option>
                    <option value="Hatchback">Hatchback</option>
                    <option value="Luxury">Luxury</option>
                  </select>
                </div>

                <button
                  onClick={fetchAvailableVehicles}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl text-sm transition-colors py-3 shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search className="h-4 w-4" />
                  <span>Search Vehicles</span>
                </button>
              </div>
            </div>

            {/* Content Tabs (Search / Booking History) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Left Listings column (takes 3 cols) */}
              <div className="lg:col-span-3 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Layers className="h-5 w-5 text-indigo-400" />
                    <span>Available Vehicles</span>
                  </h3>
                  <button 
                    onClick={fetchAvailableVehicles}
                    className="text-slate-400 hover:text-indigo-400 text-xs flex items-center gap-1.5 transition-colors cursor-pointer bg-transparent border-0"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Refresh</span>
                  </button>
                </div>

                {loadingVehicles ? (
                  <div className="text-center py-12 text-slate-500 text-sm">Loading vehicles...</div>
                ) : vehicles.length === 0 ? (
                  <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-xl p-12 text-center text-slate-500 text-sm">
                    No vehicles listed matching your criteria. Try searching "Mumbai" or "Delhi".
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {vehicles.map((v) => (
                      <div 
                        key={v.id} 
                        className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-5 hover:border-slate-700/80 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold rounded uppercase tracking-wider">
                              {v.type}
                            </span>
                            <span className="text-sm font-semibold text-slate-400 flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-rose-500" />
                              {v.location}
                            </span>
                          </div>

                          <h4 className="text-lg font-bold group-hover:text-indigo-400 transition-colors">
                            {v.brand} {v.model}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">Year: {v.year} | Reg: {v.registrationNumber}</p>
                          
                          <div className="flex items-baseline gap-1 mt-4">
                            <span className="text-xl font-extrabold text-slate-100">₹{v.pricePerDay}</span>
                            <span className="text-xs text-slate-500">/ day</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedVehicle(v);
                            setBookingStartDate('');
                            setBookingEndDate('');
                            setBookingError('');
                            setBookingSuccess('');
                          }}
                          className="w-full mt-5 py-2.5 bg-slate-800 hover:bg-indigo-500 text-slate-200 hover:text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          Book this Vehicle
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Booking History Column */}
              <div className="lg:col-span-1 space-y-6">
                <div className="border-b border-slate-800/80 pb-3">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <History className="h-5 w-5 text-indigo-400" />
                    <span>My Bookings</span>
                  </h3>
                </div>

                <div className="space-y-4">
                  {renterBookings.length === 0 ? (
                    <div className="bg-slate-900/20 border border-slate-850 rounded-xl p-6 text-center text-slate-500 text-xs">
                      No booking history found.
                    </div>
                  ) : (
                    renterBookings.map((b) => (
                      <div key={b.booking.id} className="bg-slate-900/50 border border-slate-850 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-300">
                            {b.vehicle ? `${b.vehicle.brand} ${b.vehicle.model}` : `Vehicle #${b.booking.vehicleId}`}
                          </span>
                          <span className="text-[10px] text-slate-500">#{b.booking.id}</span>
                        </div>

                        <div className="text-[11px] text-slate-400 space-y-1">
                          <div className="flex justify-between">
                            <span>Dates:</span>
                            <span>{b.booking.startDate} to {b.booking.endDate}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Amount Paid:</span>
                            <span className="font-bold text-slate-200">₹{b.booking.totalAmount}</span>
                          </div>
                          {b.booking.ownerPhone && (
                            <div className="flex justify-between">
                              <span>Owner Contact:</span>
                              <span className="font-semibold text-indigo-400">{b.booking.ownerPhone}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/40">
                          {getStatusBadge(b.booking.status)}
                          {b.booking.status === 'PENDING' && (
                            <button
                              onClick={() => handleCancelBooking(b.booking.id)}
                              className="text-[10px] font-semibold text-rose-400 hover:text-rose-300 bg-transparent border-0 cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* MODAL: Book Vehicle datepicker */}
            {selectedVehicle && (
              <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-scale-up">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Request Booking</h3>
                    <button 
                      onClick={() => setSelectedVehicle(null)} 
                      className="p-1 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer border-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-850">
                    <h4 className="font-bold text-slate-200">{selectedVehicle.brand} {selectedVehicle.model}</h4>
                    <p className="text-xs text-slate-400 mt-1">Location: {selectedVehicle.location} | Type: {selectedVehicle.type}</p>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-850/60">
                      <span className="text-xs text-slate-400">Price per day</span>
                      <span className="text-sm font-bold text-indigo-400">₹{selectedVehicle.pricePerDay}</span>
                    </div>
                  </div>

                  {bookingError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs">
                      {bookingError}
                    </div>
                  )}

                  {user && selectedVehicle.ownerId === user.id ? (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl text-center text-xs space-y-2">
                      <Shield className="h-8 w-8 mx-auto text-amber-400 opacity-80" />
                      <p className="font-semibold text-slate-200">You own this vehicle</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        This vehicle is listed under your account. You cannot rent or book your own vehicle listing.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleBookVehicle} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Start Date</label>
                          <input
                            type="date"
                            required
                            value={bookingStartDate}
                            onChange={(e) => setBookingStartDate(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">End Date</label>
                          <input
                            type="date"
                            required
                            value={bookingEndDate}
                            onChange={(e) => setBookingEndDate(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        Verify and Continue
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* MODAL: Booking Payment Simulation */}
            {paymentPendingBooking && (
              <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 animate-scale-up">
                  <div className="flex flex-col items-center text-center">
                    <div className="h-12 w-12 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 mb-3">
                      <DollarSign className="h-6 w-6 text-indigo-400 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-bold">Process Simulated Payment</h3>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      No real payment information required. This simulates checkout processing for demonstration.
                    </p>
                  </div>

                  {/* Calculations */}
                  <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-850 space-y-3">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Total Amount:</span>
                      <span className="font-bold text-slate-200">₹{paymentPendingBooking.totalAmount}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Platform Commission (10%):</span>
                      <span className="text-slate-300">₹{(paymentPendingBooking.totalAmount * 0.1).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 border-t border-slate-800 pt-2">
                      <span>Owner share:</span>
                      <span className="text-emerald-400 font-bold">₹{(paymentPendingBooking.totalAmount * 0.9).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setPaymentPendingBooking(null)}
                      disabled={processingPayment}
                      className="py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-slate-100 font-semibold rounded-lg text-xs transition-colors cursor-pointer border-0"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSimulatePayment}
                      disabled={processingPayment}
                      className="py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer border-0 flex items-center justify-center gap-1.5"
                    >
                      {processingPayment ? 'Processing...' : 'Pay Simulated ₹' + paymentPendingBooking.totalAmount}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* OWNER DASHBOARD VIEW */}
        {currentView === 'owner' && ownerEarnings && (
          <div className="space-y-8">
            {/* Earnings Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Total Earnings</span>
                <span className="text-2xl font-extrabold text-slate-100">₹{ownerEarnings.totalEarnings}</span>
                <span className="text-[10px] text-slate-500 block mt-1">Platform fee excluded</span>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Owner Share (90%)</span>
                <span className="text-2xl font-extrabold text-emerald-400">₹{ownerEarnings.ownerShare}</span>
                <span className="text-[10px] text-slate-500 block mt-1">Direct pay share</span>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Active Bookings</span>
                <span className="text-2xl font-extrabold text-indigo-400">{ownerEarnings.activeBookings}</span>
                <span className="text-[10px] text-slate-500 block mt-1">Awaiting or current</span>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Commission (10%)</span>
                <span className="text-2xl font-extrabold text-rose-400">₹{ownerEarnings.platformFees}</span>
                <span className="text-[10px] text-slate-500 block mt-1">DriveP2P service fee</span>
              </div>
            </div>

            {/* Split layout (Listings & Add Form / Requests) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Form column (takes 1 col) */}
              <div className="space-y-6">
                <div className="border-b border-slate-800/80 pb-3">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Plus className="h-5 w-5 text-indigo-400" />
                    <span>List New Vehicle</span>
                  </h3>
                </div>

                <form onSubmit={handleListVehicle} className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
                  {listVehicleSuccess && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-xs">
                      {listVehicleSuccess}
                    </div>
                  )}

                  {listVehicleError && (
                    <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-lg text-xs">
                      {listVehicleError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Brand</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hyundai"
                      value={newVehicle.brand}
                      onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Model</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Creta"
                      value={newVehicle.model}
                      onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Year</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 2024"
                        value={newVehicle.year}
                        onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Type</label>
                      <select
                        value={newVehicle.type}
                        onChange={(e) => setNewVehicle({ ...newVehicle, type: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                      >
                        <option value="SUV">SUV</option>
                        <option value="Sedan">Sedan</option>
                        <option value="Hatchback">Hatchback</option>
                        <option value="Luxury">Luxury</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Registration Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MH12XX9999"
                      value={newVehicle.registrationNumber}
                      onChange={(e) => setNewVehicle({ ...newVehicle, registrationNumber: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Owner Contact Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. +91 9876543210"
                      value={newVehicle.ownerPhone}
                      onChange={(e) => setNewVehicle({ ...newVehicle, ownerPhone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Location</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mumbai"
                        value={newVehicle.location}
                        onChange={(e) => setNewVehicle({ ...newVehicle, location: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Daily Rate (₹)</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 2500"
                        value={newVehicle.pricePerDay}
                        onChange={(e) => setNewVehicle({ ...newVehicle, pricePerDay: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    List Vehicle Listing
                  </button>
                </form>
              </div>

              {/* Middle Owner's listings column (takes 1 col) */}
              <div className="space-y-6">
                <div className="border-b border-slate-800/80 pb-3">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Car className="h-5 w-5 text-indigo-400" />
                    <span>My Listed Cars</span>
                  </h3>
                </div>

                <div className="space-y-4">
                  {ownerVehicles.length === 0 ? (
                    <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
                      No listings registered yet.
                    </div>
                  ) : (
                    ownerVehicles.map((v) => (
                      <div key={v.id} className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 flex flex-col justify-between space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-200">{v.brand} {v.model}</h4>
                            <span className="text-[10px] text-slate-500">{v.type} • {v.registrationNumber}</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-300">₹{v.pricePerDay}/d</span>
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-850 pt-3">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-rose-500" />
                            {v.location}
                          </span>
                          {getStatusBadge(v.status)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Booking requests column (takes 1 col) */}
              <div className="space-y-6">
                <div className="border-b border-slate-800/80 pb-3">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-indigo-400" />
                    <span>Booking Requests</span>
                  </h3>
                </div>

                <div className="space-y-4">
                  {ownerBookings.length === 0 ? (
                    <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
                      No active bookings on your vehicles.
                    </div>
                  ) : (
                    ownerBookings.map((ob) => (
                      <div key={ob.booking.id} className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-bold text-slate-300">
                              {ob.vehicle ? `${ob.vehicle.brand} ${ob.vehicle.model}` : `Vehicle #${ob.booking.vehicleId}`}
                            </h4>
                            <span className="text-[10px] text-slate-500">Request ID: #{ob.booking.id}</span>
                          </div>
                          <span className="text-xs font-extrabold text-indigo-400">₹{ob.booking.totalAmount}</span>
                        </div>

                        <div className="text-[10px] text-slate-400 space-y-1">
                          <div className="flex justify-between">
                            <span>Dates:</span>
                            <span>{ob.booking.startDate} to {ob.booking.endDate}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Status:</span>
                            <span className="uppercase font-semibold text-slate-300">{ob.booking.status}</span>
                          </div>
                        </div>

                        {ob.booking.status === 'PENDING' && (
                          <div className="flex gap-2 pt-2 border-t border-slate-800/40">
                            <button
                              onClick={() => handleRejectBooking(ob.booking.id)}
                              className="flex-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded text-[11px] font-semibold cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleAcceptBooking(ob.booking.id)}
                              className="flex-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded text-[11px] font-semibold cursor-pointer"
                            >
                              Accept
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADMIN DASHBOARD VIEW */}
        {currentView === 'admin' && (
          <div className="space-y-8">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-rose-400" />
              <span>Platform Administration Panel</span>
            </h2>

            {/* Split layout: Verification queue & listings details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Approval Queue (takes 2 columns) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="border-b border-slate-800/80 pb-3">
                  <h3 className="text-lg font-bold">Pending Approvals Queue</h3>
                </div>

                <div className="space-y-4">
                  {adminVehicles.filter(v => v.status === 'PENDING_APPROVAL').length === 0 ? (
                    <div className="bg-slate-900/20 border border-slate-850 rounded-xl p-8 text-center text-slate-500 text-sm">
                      No vehicles currently awaiting approval.
                    </div>
                  ) : (
                    adminVehicles.filter(v => v.status === 'PENDING_APPROVAL').map((v) => (
                      <div key={v.id} className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-200 text-base">{v.brand} {v.model}</h4>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">({v.type})</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Year: {v.year} | Reg: {v.registrationNumber} | Owner ID: {v.ownerId}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Location: {v.location} | Daily rate: ₹{v.pricePerDay}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRejectVehicle(v.id)}
                            className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Reject listing
                          </button>
                          <button
                            onClick={() => handleApproveVehicle(v.id)}
                            className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Approve listing
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* System listings stats */}
                <div className="pt-6">
                  <div className="border-b border-slate-800/80 pb-3 mb-4">
                    <h3 className="text-lg font-bold">System Registered Listings</h3>
                  </div>

                  <div className="bg-slate-900/20 border border-slate-850 rounded-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 uppercase tracking-wider">
                          <th className="p-3">ID</th>
                          <th className="p-3">Vehicle</th>
                          <th className="p-3">Owner ID</th>
                          <th className="p-3">Location</th>
                          <th className="p-3">Rate</th>
                          <th className="p-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {adminVehicles.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-900/40">
                            <td className="p-3 text-slate-500">#{v.id}</td>
                            <td className="p-3 font-semibold text-slate-300">{v.brand} {v.model} ({v.year})</td>
                            <td className="p-3">User #{v.ownerId}</td>
                            <td className="p-3">{v.location}</td>
                            <td className="p-3">₹{v.pricePerDay}/d</td>
                            <td className="p-3 text-right">{v.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Users & stats sidebar (takes 1 column) */}
              <div className="space-y-6">
                <div className="border-b border-slate-800/80 pb-3">
                  <h3 className="text-lg font-bold">User Registrations</h3>
                </div>

                <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-4 space-y-4">
                  {adminUsers.map((u) => (
                    <div key={u.id} className="text-xs space-y-1.5 border-b border-slate-850 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-200">{u.name}</span>
                        <span className="text-slate-500">#{u.id}</span>
                      </div>
                      <div className="text-slate-400 flex justify-between">
                        <span>Email:</span>
                        <span>{u.email}</span>
                      </div>
                      <div className="text-slate-400 flex justify-between">
                        <span>Phone:</span>
                        <span>{u.phone}</span>
                      </div>
                      <div className="flex gap-1.5 pt-1">
                        {u.roles.map((role) => (
                          <span key={role} className="px-1.5 py-0.5 bg-slate-800/80 text-[9px] text-slate-400 rounded">
                            {role.replace('ROLE_', '')}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-600 mt-12">
        <p>© 2026 DriveP2P Marketplace. Built with Spring Cloud Microservices + React.</p>
        <p className="mt-1.5 text-[10px] text-slate-700">Service Registry (Eureka) | API Gateway | Security RBAC | JPA Hibernate</p>
      </footer>

    </div>
  );
}
