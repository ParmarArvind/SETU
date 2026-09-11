import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  NavLink,
  useNavigate,
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import {
  useOrganization,
} from '../context/OrganizationContext';

import {
  useSocket,
} from '../context/SocketContext';

import {
  listNotifications,
} from '../services/notification.service';

import './navbar-notification.css';

// ============================================================
// Initial theme
// ============================================================

const getInitialTheme =
  () => {
    const savedTheme =
      localStorage.getItem(
        'setu-theme',
      ) ||
      localStorage.getItem(
        'devsync-theme',
      );

    if (
      savedTheme === 'light' ||
      savedTheme === 'dark'
    ) {
      return savedTheme;
    }

    return window
      .matchMedia?.(
        '(prefers-color-scheme: light)',
      ).matches
      ? 'light'
      : 'dark';
  };

// ============================================================
// Navbar
// ============================================================

const Navbar = () => {
  const {
    user,
    logout,
  } = useAuth();

  const {
    currentOrganizationId,
    currentRole,
  } =
    useOrganization();

  const {
  onNotificationNew,
  onNotificationRead,
  onNotificationsAllRead,
} = useSocket();

  const navigate =
    useNavigate();

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  const [
    theme,
    setTheme,
  ] = useState(
    getInitialTheme,
  );

  const [
    unreadNotifications,
    setUnreadNotifications,
  ] = useState(0);
  

  // ==========================================================
  // Theme
  // ==========================================================

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      theme,
    );

    localStorage.setItem(
      'setu-theme',
      theme,
    );
  }, [theme]);

  // ==========================================================
  // Initial unread notification count
  //
  // We still make ONE API request when Navbar mounts.
  //
  // After that, Socket.IO handles new notifications.
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    const loadUnreadCount =
      async () => {
        try {
          const response =
            await listNotifications(
              100,
            );

          if (!mounted) {
            return;
          }

          const unreadCount =
            response?.data
              ?.unreadCount;

          // ----------------------------------------------------
          // Prefer backend's unreadCount.
          // ----------------------------------------------------

          if (
            typeof unreadCount ===
            'number'
          ) {
            setUnreadNotifications(
              unreadCount,
            );

            return;
          }

          // ----------------------------------------------------
          // Fallback for older responses.
          // ----------------------------------------------------

          const notifications =
            response?.data
              ?.notifications ||
            [];

          setUnreadNotifications(
            notifications.filter(
              (notification) =>
                !notification.read,
            ).length,
          );
        } catch {
          // Notification failure should never prevent Navbar
          // from rendering.
        }
      };

    loadUnreadCount();

    return () => {
      mounted = false;
    };
  }, []);

  

  // ==========================================================
  // Real-time notification
  //
  // Backend event:
  //
  // notification:new
  //
  // Every notification is sent only to its recipient.
  // ==========================================================

  useEffect(() => {
    if (
      typeof onNotificationNew !==
      'function'
    ) {
      return undefined;
    }

    const unsubscribe =
      onNotificationNew(
        (payload) => {
          const notification =
            payload?.notification;

          if (!notification) {
            return;
          }

          console.log(
            '[Navbar] New notification:',
            notification,
          );

          // ----------------------------------------------------
          // Immediately increase unread count.
          // ----------------------------------------------------

          setUnreadNotifications(
            (current) =>
              current + 1,
          );
        },
      );

    return unsubscribe;
  }, [
    onNotificationNew,
  ]);

  useEffect(() => {
  if (
    typeof onNotificationRead !== 'function'
  ) {
    return undefined;
  }

  const unsubscribe =
    onNotificationRead((payload) => {
      if (!payload?.notificationId) {
        return;
      }

      setUnreadNotifications((current) =>
        Math.max(current - 1, 0),
      );
    });

  return unsubscribe;
}, [onNotificationRead]);

useEffect(() => {
  if (
    typeof onNotificationsAllRead !== 'function'
  ) {
    return undefined;
  }

  const unsubscribe =
    onNotificationsAllRead(() => {
      setUnreadNotifications(0);
    });

  return unsubscribe;
}, [onNotificationsAllRead]);



  // ==========================================================
  // Theme toggle
  // ==========================================================

  const toggleTheme =
    () => {
      setTheme(
        (current) =>
          current === 'dark'
            ? 'light'
            : 'dark',
      );
    };

  // ==========================================================
  // Mobile menu
  // ==========================================================

  const closeMobileMenu =
    () => {
      setMobileOpen(false);
    };

  // ==========================================================
  // Logout
  // ==========================================================

  const handleLogout =
    async () => {
      closeMobileMenu();

      try {
        await logout();

        navigate(
          '/login',
          {
            replace: true,
          },
        );
      } catch (error) {
        console.error(
          'Logout failed:',
          error,
        );
      }
    };

  // ==========================================================
  // Navigation class
  // ==========================================================

  const navClass =
    ({
      isActive,
    }) =>
      `navbar-link ${
        isActive
          ? 'active'
          : ''
      }`;

  // ==========================================================
  // Role formatting
  // ==========================================================

  const formattedRole =
    currentRole
      ? currentRole
          .replace(
            /_/g,
            ' ',
          )
          .replace(
            /\b\w/g,
            (char) =>
              char.toUpperCase(),
          )
      : 'Member';

  // ==========================================================
  // Render
  // ==========================================================

  return (
    <header className="navbar">
      <div className="navbar-inner">

        {/* ================================================== */}
        {/* Brand */}
        {/* ================================================== */}

        <Link
          to="/dashboard"
          className="navbar-brand"
          onClick={
            closeMobileMenu
          }
        >
          <span
            className="navbar-logo"
            aria-hidden="true"
          >
            S
          </span>

          <span className="navbar-brand-text">
            SETU
          </span>
        </Link>

        {/* ================================================== */}
        {/* Desktop navigation */}
        {/* ================================================== */}

        <nav
          className="navbar-main-nav"
          aria-label="Main navigation"
        >
          <NavLink
            to="/dashboard"
            className={navClass}
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/organizations"
            className={navClass}
          >
            Organizations
          </NavLink>

          {currentOrganizationId && (
            <NavLink
              to={`/organizations/${currentOrganizationId}/projects`}
              className={navClass}
            >
              Projects
            </NavLink>
          )}
        </nav>

        {/* ================================================== */}
        {/* Navbar actions */}
        {/* ================================================== */}

        <div className="navbar-actions">

          {/* ================================================ */}
          {/* Notifications */}
          {/* ================================================ */}

          <NavLink
            to="/notifications"
            className={({
              isActive,
            }) =>
              `navbar-notification-link ${
                isActive
                  ? 'active'
                  : ''
              }`
            }
            aria-label={`Notifications${
              unreadNotifications >
              0
                ? `, ${unreadNotifications} unread`
                : ''
            }`}
            title="Notifications"
          >
            <span aria-hidden="true">
              🔔
            </span>

            {unreadNotifications >
              0 && (
              <span className="navbar-notification-badge">
                {unreadNotifications >
                99
                  ? '99+'
                  : unreadNotifications}
              </span>
            )}
          </NavLink>

          {/* ================================================ */}
          {/* Theme */}
          {/* ================================================ */}

          <button
            type="button"
            className="theme-toggle"
            onClick={
              toggleTheme
            }
            aria-label={`Switch to ${
              theme === 'dark'
                ? 'light'
                : 'dark'
            } mode`}
            title={`Switch to ${
              theme === 'dark'
                ? 'light'
                : 'dark'
            } mode`}
          >
            <span
              className="theme-toggle-icon"
              aria-hidden="true"
            >
              {theme === 'dark'
                ? '☀'
                : '☾'}
            </span>

            <span className="theme-toggle-label">
              {theme === 'dark'
                ? 'Light'
                : 'Dark'}
            </span>
          </button>

          {/* ================================================ */}
          {/* User */}
          {/* ================================================ */}

          <div className="navbar-user">
            <div className="navbar-user-info">

              <div className="navbar-avatar">
                {user?.name
                  ?.charAt(0)
                  ?.toUpperCase() ||
                  'U'}
              </div>

              <div className="navbar-user-details">
                <strong>
                  {user?.name ||
                    'User'}
                </strong>

                <span>
                  {user?.email ||
                    ''}
                </span>
              </div>

              <span
                className={`navbar-role-badge ${
                  currentRole
                    ? `role-${currentRole}`
                    : ''
                }`}
                title={
                  currentRole
                    ? `Current organization role: ${formattedRole}`
                    : 'Current organization role'
                }
              >
                {formattedRole}
              </span>

            </div>

            <button
              type="button"
              className="navbar-logout"
              onClick={
                handleLogout
              }
            >
              Logout
            </button>
          </div>
        </div>

        {/* ================================================== */}
        {/* Mobile menu button */}
        {/* ================================================== */}

        <button
          type="button"
          className="navbar-mobile-button"
          onClick={() =>
            setMobileOpen(
              (previous) =>
                !previous,
            )
          }
          aria-label="Toggle navigation"
          aria-expanded={
            mobileOpen
          }
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* ==================================================== */}
      {/* Mobile menu */}
      {/* ==================================================== */}

      {mobileOpen && (
        <div className="navbar-mobile-menu">

          <NavLink
            to="/dashboard"
            className={navClass}
            onClick={
              closeMobileMenu
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/organizations"
            className={navClass}
            onClick={
              closeMobileMenu
            }
          >
            Organizations
          </NavLink>

          <NavLink
            to="/notifications"
            className={navClass}
            onClick={
              closeMobileMenu
            }
          >
            Notifications

            {unreadNotifications >
              0 &&
              ` (${unreadNotifications})`}
          </NavLink>

          {currentOrganizationId && (
            <NavLink
              to={`/organizations/${currentOrganizationId}/projects`}
              className={navClass}
              onClick={
                closeMobileMenu
              }
            >
              Projects
            </NavLink>
          )}

          <div className="navbar-mobile-role">
            <span className="navbar-mobile-role-label">
              Current Role
            </span>

            <span
              className={`navbar-role-badge ${
                currentRole
                  ? `role-${currentRole}`
                  : ''
              }`}
            >
              {formattedRole}
            </span>
          </div>

          <button
            type="button"
            className="theme-toggle mobile-theme-toggle"
            onClick={
              toggleTheme
            }
          >
            <span
              className="theme-toggle-icon"
              aria-hidden="true"
            >
              {theme === 'dark'
                ? '☀'
                : '☾'}
            </span>

            <span className="theme-toggle-label">
              {theme === 'dark'
                ? 'Light Mode'
                : 'Dark Mode'}
            </span>
          </button>

          <button
            type="button"
            className="navbar-mobile-logout"
            onClick={
              handleLogout
            }
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
};

export default Navbar;