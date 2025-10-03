import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { FiUsers, FiGrid, FiActivity, FiMenu, FiX, FiMessageSquare, FiHome, FiPlusCircle, FiLogOut, FiList } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

// --- LOGO SVG ---
const Logo = () => (
    <div className="flex items-center gap-2 px-4 py-3">
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#22d3ee" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-7 h-7"
        >
            {/* Cervello (Forma Base - Mental) */}
            <path d="M12 2a10 10 0 0 0-7 3c-1.5 1.5-2 4.5-2 7a10 10 0 0 0 14 0c0-2.5.5-5.5 2-7a10 10 0 0 0-7-3z" fill="rgba(34, 211, 238, 0.1)"/>
            {/* Manubrio / Forza (Fitness) */}
            <circle cx="9" cy="11" r="1.5" fill="#22d3ee" />
            <circle cx="15" cy="13" r="1.5" fill="#22d3ee" />
            <path d="M10.5 11.5 L13.5 12.5" stroke="#22d3ee" strokeWidth="2" />
        </svg>
        <span className="text-xl font-bold text-white">PT Manager</span>
    </div>
);
// ----------------

const navLinks = [
  { to: '/', icon: <FiGrid size={18} />, label: 'Dashboard', iconComponent: FiGrid },
  { to: '/clients', icon: <FiUsers size={18} />, label: 'Clienti', iconComponent: FiUsers },
  { to: '/new', icon: <FiPlusCircle size={18} />, label: 'Nuovo Cliente', iconComponent: FiPlusCircle },
  { to: '/updates', icon: <FiActivity size={18} />, label: 'Aggiornamenti', iconComponent: FiActivity },
  { to: '/chat', icon: <FiMessageSquare size={18} />, label: 'Chat', iconComponent: FiMessageSquare },
];

const NavLinkComponent = ({ to, icon, label, onClick, location }) => {
  const isActive = location.pathname === to || (to === '/' && location.pathname === '/');
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full p-2.5 rounded-md text-sm transition-colors ${
        isActive ? 'bg-primary/20 text-white font-semibold' : 'text-muted hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}<span>{label}</span>
    </button>
  );
};

const SidebarContent = ({ onLinkClick }) => {
  const navigate = useNavigate();
  const auth = getAuth();
  const location = useLocation();

  const handleLogout = () => {
    signOut(auth).then(() => {
      navigate('/login');
    });
  };

  return (
    <aside className="w-64 bg-card/60 backdrop-blur-lg p-4 flex flex-col border-r border-white/10 h-full">
      <Logo />
      <nav className="flex flex-col gap-2 flex-1">
        {navLinks.map(link => (
          <NavLinkComponent 
            key={link.to}
            to={link.to} 
            icon={link.icon} 
            label={link.label}
            location={location}
            onClick={() => {
              navigate(link.to);
              if (onLinkClick) onLinkClick();
            }}
          />
        ))}
      </nav>
      
      <div className="mt-4 pt-4 border-t border-white/10">
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors">
            <FiLogOut size={20} />
            <span className="text-sm font-semibold">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default function MainLayout() { 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="relative min-h-screen text-foreground flex">
      <AnimatedBackground />

      {/* Sidebar per Desktop */}
      <div className="hidden md:flex md:fixed h-full z-30">
        <SidebarContent />
      </div>

      {/* Menu per Mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 h-full z-50 md:hidden"
          >
            <SidebarContent onLinkClick={() => setIsMobileMenuOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 md:ml-60">
        {/* Header per Mobile */}
        <header className="md:hidden sticky top-0 bg-card/80 backdrop-blur-md h-16 flex items-center justify-between px-4 border-b border-white/10 z-40">
           <Logo />
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white">
            {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

const AnimatedBackground = () => (
  <div className="absolute inset-0 -z-10 overflow-hidden bg-background">
    <motion.div
      className="absolute top-[10%] left-[5%] h-[400px] w-[400px] rounded-full bg-blue-500/20 filter blur-3xl"
      animate={{ 
        x: [0, 150, -50, 0], 
        y: [0, -50, 100, 0],
        scale: [1, 1.3, 0.8, 1],
      }}
      transition={{ duration: 40, repeat: Infinity, repeatType: 'mirror' }}
    />
    <motion.div
      className="absolute bottom-[10%] right-[5%] h-[400px] w-[400px] rounded-full bg-cyan-500/20 filter blur-3xl"
      animate={{ 
        x: [0, -100, 50, 0], 
        y: [0, 100, -50, 0],
        scale: [1, 0.8, 1.2, 1],
      }}
      transition={{ duration: 45, repeat: Infinity, repeatType: 'mirror', delay: 7 }}
    />
  </div>
);
