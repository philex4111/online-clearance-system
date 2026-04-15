import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import DepartmentDashboard from './pages/DepartmentDashboard';
import AdminDashboard from './pages/AdminDashboard'; // Import Admin

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/department" element={<DepartmentDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} /> 
      </Routes>
    </Router>
  );
}

export default App;