import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaHome, FaSignOutAlt,
  FaClipboardList, FaMapMarkerAlt, FaBus
} from 'react-icons/fa';
import { Button, Dropdown } from 'react-bootstrap';
import { BsList } from 'react-icons/bs';
import styles from '../../despachador/sidebar/sidebar.module.css';

const SiderDespachador = ({ onNavigate }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const location = useLocation();
  const navigate = useNavigate();

  const handleClose = useCallback(() => {
    setShowSidebar(false);
    if (onNavigate) onNavigate();
  }, [onNavigate]);

  const handleShow = useCallback(() => {
    setShowSidebar(true);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      setShowSidebar(!mobile);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavigation = (e, to) => {
    e.preventDefault();
    navigate(to);
    if (isMobile) {
      setShowSidebar(false);
      if (onNavigate) onNavigate();
    }
  };

  const isActive = (to) => location.pathname === to;

  const navItems = [
    { to: '/despachador', icon: <FaHome />, text: 'Inicio', type: 'link' },
    {
      type: 'dropdown',
      text: 'Gestión de Rutas',
      icon: <FaClipboardList />,
      items: [
        { to: '/despachador/rutas', icon: <FaClipboardList />, text: 'Rutas' }
      ]
    },
    {
      type: 'dropdown',
      text: 'Gestión de Conductores',
      icon: <FaClipboardList />,
      items: [
        { to: '/despachador/conductores', icon: <FaClipboardList />, text: 'Gestionar Conductores' }
      ]
    },
    {
      type: 'dropdown',
      text: 'Gestión de Paraderos',
      icon: <FaMapMarkerAlt />,
      items: [
        { to: '/despachador/paraderos', icon: <FaMapMarkerAlt />, text: 'Paraderos' }
      ]
    }
  ];

  return (
    <>
      {isMobile && (
        <Button variant="light" className={styles.sidebarToggle} onClick={handleShow}>
          <BsList size={24} />
        </Button>
      )}

      {isMobile && showSidebar && (
        <div className={styles.sidebarOverlay} onClick={handleClose} />
      )}

      <div className={`${styles.sidebarContainer} ${showSidebar ? styles.open : ''}`}>
        <div className={styles.sidebarLogo}>
          <FaBus className={styles.logoIcon} />
          <div style={{ fontSize: '0.85rem', color: 'white', marginTop: '0.5rem' }}>Rouwhite</div>
        </div>

        <nav className={styles.sidebarNav}>
          {navItems.map((item, index) => {
            if (item.type === 'dropdown') {
              return (
                <Dropdown key={index} className={styles.sidebarDropdown}>
                  <Dropdown.Toggle
                    as="div"
                    className={`${styles.sidebarLink} ${item.items.some(i => isActive(i.to)) ? styles.active : ''}`}
                  >
                    <span className={styles.sidebarIcon}>{item.icon}</span>
                    <span className={styles.sidebarText}>{item.text}</span>
                  </Dropdown.Toggle>
                  <Dropdown.Menu className={styles.dropdownMenu}>
                    {item.items.map((subItem, subIndex) => (
                      <Dropdown.Item
                        key={subIndex}
                        as={Link}
                        to={subItem.to}
                        className={`${styles.dropdownItem} ${isActive(subItem.to) ? styles.active : ''}`}
                        onClick={(e) => handleNavigation(e, subItem.to)}
                      >
                        <span className={styles.sidebarIcon}>{subItem.icon}</span>
                        <span className={styles.sidebarText}>{subItem.text}</span>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              );
            }

            return (
              <Link
                key={index}
                to={item.to}
                className={`${styles.sidebarLink} ${isActive(item.to) ? styles.active : ''}`}
                onClick={(e) => handleNavigation(e, item.to)}
              >
                <span className={styles.sidebarIcon}>{item.icon}</span>
                <span className={styles.sidebarText}>{item.text}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <button
            className={styles.sidebarLink}
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
          >
            <FaSignOutAlt className={styles.sidebarIcon} />
            <span className={styles.sidebarText}>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default SiderDespachador;
