import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from '../App';
import Landing from '../pages/Landing';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';

// Layouts
import { PatientLayout } from '../components/layout/PatientLayout';
import { DoctorLayout } from '../components/layout/DoctorLayout';
import { AdminLayout } from '../components/layout/AdminLayout';

// Common Auth Guards
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { RoleRoute } from '../components/common/RoleRoute';

// Patient Pages
import PatientDashboard from '../pages/patient/Dashboard';
import DoctorSearch from '../pages/patient/DoctorSearch';
import DoctorProfilePage from '../pages/patient/DoctorProfile';
import BookAppointment from '../pages/patient/BookAppointment';
import MyAppointments from '../pages/patient/MyAppointments';
import PatientAppointmentDetail from '../pages/patient/AppointmentDetail';
import PatientMedications from '../pages/patient/Medications';
import PatientProfile from '../pages/patient/Profile';

// Doctor Pages
import DoctorDashboard from '../pages/doctor/Dashboard';
import DoctorAppointments from '../pages/doctor/Appointments';
import DoctorAppointmentDetail from '../pages/doctor/AppointmentDetail';
import PostVisitNotes from '../pages/doctor/PostVisitNotes';
import DoctorAvailability from '../pages/doctor/Availability';
import DoctorProfileSettings from '../pages/doctor/Profile';

// Admin Pages
import AdminDashboard from '../pages/admin/Dashboard';
import AdminDoctors from '../pages/admin/Doctors';
import DoctorForm from '../pages/admin/DoctorForm';
import AdminPatients from '../pages/admin/Patients';
import AdminAppointments from '../pages/admin/Appointments';
import AdminLeaveManagement from '../pages/admin/LeaveManagement';
import AdminNotifications from '../pages/admin/Notifications';
import AdminWorkingHours from '../pages/admin/WorkingHours';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },

      // Protected Authenticated Routes
      {
        element: <ProtectedRoute />,
        children: [
          // ─── Patient Portal ──────────────────────────────────────────
          {
            path: 'patient',
            element: <RoleRoute allowedRoles={['PATIENT']} />,
            children: [
              {
                element: <PatientLayout />,
                children: [
                  { index: true, element: <PatientDashboard /> },
                  { path: 'doctors', element: <DoctorSearch /> },
                  { path: 'doctors/:id', element: <DoctorProfilePage /> },
                  { path: 'book', element: <BookAppointment /> },
                  { path: 'appointments', element: <MyAppointments /> },
                  { path: 'appointments/:id', element: <PatientAppointmentDetail /> },
                  { path: 'medications', element: <PatientMedications /> },
                  { path: 'profile', element: <PatientProfile /> },
                ],
              },
            ],
          },

          // ─── Doctor Portal ───────────────────────────────────────────
          {
            path: 'doctor',
            element: <RoleRoute allowedRoles={['DOCTOR']} />,
            children: [
              {
                element: <DoctorLayout />,
                children: [
                  { index: true, element: <DoctorDashboard /> },
                  { path: 'appointments', element: <DoctorAppointments /> },
                  { path: 'appointments/:id', element: <DoctorAppointmentDetail /> },
                  { path: 'appointments/:id/post-visit', element: <PostVisitNotes /> },
                  { path: 'availability', element: <DoctorAvailability /> },
                  { path: 'profile', element: <DoctorProfileSettings /> },
                ],
              },
            ],
          },

          // ─── Admin Portal ────────────────────────────────────────────
          {
            path: 'admin',
            element: <RoleRoute allowedRoles={['ADMIN']} />,
            children: [
              {
                element: <AdminLayout />,
                children: [
                  { index: true, element: <AdminDashboard /> },
                  { path: 'doctors', element: <AdminDoctors /> },
                  { path: 'doctors/new', element: <DoctorForm /> },
                  { path: 'patients', element: <AdminPatients /> },
                  { path: 'appointments', element: <AdminAppointments /> },
                  { path: 'leaves', element: <AdminLeaveManagement /> },
                  { path: 'notifications', element: <AdminNotifications /> },
                  { path: 'working-hours', element: <AdminWorkingHours /> },
                ],
              },
            ],
          },
        ],
      },

      // Fallback
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
