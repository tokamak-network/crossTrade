'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export const Navigation = () => {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-left">
          <div className="logo">
            <div className="logo-icon"></div>
            <span className="logo-text">Cross Trade</span>
          </div>
        </div>

        <div className="nav-center">
          <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
           <span className='text-navbar'>
            Create Request
           </span>
          </Link>
          <Link href="/request-pool" className={`nav-link ${pathname === '/request-pool' ? 'active' : ''}`}>
            <span className='text-navbar'>
              Request Pool
            </span>
          </Link>
          <Link href="/history" className={`nav-link ${pathname === '/history' ? 'active' : ''}`}>
            <span className='text-navbar'>
              History
            </span>
          </Link>
        </div>

        <div className="nav-right">
          <appkit-button />
          <button
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Menu Drawer */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <Link href="/" className={`mobile-link ${pathname === '/' ? 'active' : ''}`}>
          Create Request
        </Link>
        <Link href="/request-pool" className={`mobile-link ${pathname === '/request-pool' ? 'active' : ''}`}>
          Request Pool
        </Link>
        <Link href="/history" className={`mobile-link ${pathname === '/history' ? 'active' : ''}`}>
          History
        </Link>
      </div>

      <style jsx>{`
        .navigation {
          background: #0a0a0a;
          border-bottom: 1px solid #1a1a1a;
          padding: 16px 0;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .text-navbar {
          color: #ffffff;
          font-size: 16px;
          font-weight: 500;
        }
        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
        }

        .nav-left {
          display: flex;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo-icon {
          width: 24px;
          height: 24px;
          background: #22c55e;
          border-radius: 50%;
          position: relative;
        }

        .logo-icon::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: #0a0a0a;
          border-radius: 50%;
        }

        .logo-text {
          color: #ffffff;
          font-size: 18px;
          font-weight: 600;
        }

        .nav-center {
          display: flex;
          gap: 32px;
        }

        .nav-link {
          color: #888888 !important;
          text-decoration: none;
          font-size: 16px;
          font-weight: 500;
          transition: color 0.2s ease;
          position: relative;
        }

        .nav-link:hover {
          color: #ffffff !important;
        }

        .nav-link.active {
          color: #ffffff !important;
        }

        .nav-link.active .text-navbar {
          color: #ffffff;
        }

        .nav-link .text-navbar {
          color: inherit;
        }

        .nav-link.active::after {
          content: '';
          position: absolute;
          bottom: -20px;
          left: 0;
          right: 0;
          height: 2px;
          background: #6366f1;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* Hamburger button - hidden on desktop */
        .hamburger-btn {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 4px;
          width: 32px;
          height: 32px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
        }

        .hamburger-line {
          display: block;
          width: 20px;
          height: 2px;
          background: #ffffff;
          border-radius: 1px;
          transition: all 0.3s ease;
        }

        .hamburger-line.open:nth-child(1) {
          transform: rotate(45deg) translateY(4px);
        }

        .hamburger-line.open:nth-child(2) {
          opacity: 0;
        }

        .hamburger-line.open:nth-child(3) {
          transform: rotate(-45deg) translateY(-4px);
        }

        /* Mobile backdrop */
        .mobile-backdrop {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 98;
        }

        /* Mobile menu drawer */
        .mobile-menu {
          display: none;
          position: fixed;
          top: 65px;
          right: 0;
          width: 240px;
          background: #111111;
          border: 1px solid #222222;
          border-radius: 12px 0 0 12px;
          padding: 16px;
          transform: translateX(100%);
          transition: transform 0.3s ease;
          z-index: 99;
          flex-direction: column;
          gap: 8px;
        }

        .mobile-menu.open {
          transform: translateX(0);
        }

        .mobile-link {
          color: #888888;
          text-decoration: none;
          font-size: 16px;
          font-weight: 500;
          padding: 12px 16px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .mobile-link:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
        }

        .mobile-link.active {
          color: #ffffff;
          background: rgba(99, 102, 241, 0.15);
          border-left: 2px solid #6366f1;
        }

        @media (max-width: 768px) {
          .nav-center {
            display: none;
          }

          .hamburger-btn {
            display: flex;
          }

          .mobile-backdrop {
            display: block;
          }

          .mobile-menu {
            display: flex;
          }

          .nav-container {
            padding: 0 16px;
          }
        }
      `}</style>
    </nav>
  )
}
