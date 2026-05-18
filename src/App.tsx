import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Scheduler from './pages/Scheduler';
import Communication from './pages/Communication';
import Settings from './pages/Settings';
import Journal from './pages/Journal';
import Transactions from './pages/Transactions';
import Login from './pages/Login';
import CardsManagement from './pages/CardsManagement';

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="membres" element={<Members />} />
              <Route path="cartes" element={<CardsManagement />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="planificateur" element={<Scheduler />} />
              <Route path="communication" element={<Communication />} />
              <Route path="journal" element={<Journal />} />
              <Route path="parametres" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
