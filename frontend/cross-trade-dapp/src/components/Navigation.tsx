'use client'

import Link from 'next/link'

export const Navigation = () => {
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
          <Link href="/" className="nav-link active">
           <span className='text-navbar'>
            Create Request
           </span>
          </Link>
          <Link href="/request-pool" className="nav-link">
            <span className='text-navbar'>
              Request Pool
            </span>
          </Link>
          <Link href="/history" className="nav-link">
            <span className='text-navbar'>
              History
            </span>
          </Link>
        </div>
        
        <div className="nav-right">
          <appkit-button />
        </div>
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
          color: #ffffff !important;
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
        }



        @media (max-width: 768px) {
          .nav-center {
            display: none;
          }
          
          .nav-container {
            padding: 0 16px;
          }
        }
      `}</style>
    </nav>
  )
}