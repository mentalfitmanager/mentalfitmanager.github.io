import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { FiUsers, FiGrid, FiActivity, FiMenu, FiX, FiMessageSquare } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

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


const navLinks = [
  { to: '/', icon: <FiGrid size={18} />, label: 'Dashboard' },
  { to: '/clients', icon: <FiUsers size={18} />, label: 'Clienti' },
  { to: '/chat', icon: <FiMessageSquare size={18} />, label: 'Chat' },
  { to: '/updates', icon: <FiActivity size={18} />, label: 'Aggiornamenti' },
];

const NavLink = ({ to, icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
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
  return (
    <aside className="w-60 bg-card/60 backdrop-blur-lg p-4 flex flex-col border-r border-white/10 h-full">
      <h2 className="text-xl font-bold mb-8 px-2">PT Manager</h2>
      <nav className="flex flex-col gap-2">
        {navLinks.map(link => (
          <NavLink 
            key={link.to}
            to={link.to} 
            icon={link.icon} 
            label={link.label}
            onClick={() => {
              navigate(link.to);
              if (onLinkClick) onLinkClick();
            }}
          />
        ))}
      </nav>
    </aside>
  );
};

export default function MainLayout() { 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="relative min-h-screen text-foreground">
      <AnimatedBackground />

      {/* Sidebar per Desktop */}
      <div className="hidden md:flex md:fixed h-full">
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
           <h2 className="text-lg font-bold">PT Manager</h2>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
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
            {/* --- QUI VIENE INSERITA LA PAGINA CORRETTA (Dashboard, Clienti, etc.) --- */}
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

