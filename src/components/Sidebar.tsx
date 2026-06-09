import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, BriefcaseBusiness, Bot, Network,
  CalendarDays, Terminal, MessageSquareCode, ChevronLeft, ChevronRight,
  Cpu, Settings,
} from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import AuroraRing from './AuroraRing'

const NAV = [
  { to: '/',          icon: LayoutDashboard,   label: 'Overview'  },
  { to: '/jobs',      icon: BriefcaseBusiness, label: 'Jobs'      },
  { to: '/agents',    icon: Bot,               label: 'Agents'    },
  { to: '/nodes',     icon: Network,           label: 'Nodes'     },
  { to: '/providers', icon: Cpu,               label: 'Providers' },
  { to: '/calendar',  icon: CalendarDays,      label: 'Calendar'  },
  { to: '/logs',      icon: Terminal,          label: 'Logs'      },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { chatOpen, setChatOpen, snapshot } = useApp()
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <AuroraRing size={collapsed ? 36 : 48} style={{ flexShrink: 0 }} />
        {!collapsed && (
          <div className="sidebar-logo-text-wrap">
            <span className="sidebar-logo-text">CORTEX</span>
            <span className="sidebar-logo-sub">SWARM MONITOR</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            title={collapsed ? label : undefined}
          >
            <Icon size={18} strokeWidth={1.8} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Setup link */}
      <NavLink to="/setup" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        title={collapsed ? 'Setup' : undefined}>
        <Settings size={18} strokeWidth={1.8} />
        {!collapsed && <span>Setup</span>}
      </NavLink>

      {/* Bottom actions */}
      <div className="sidebar-bottom">
        <button
          className={`sidebar-item ${chatOpen ? 'active' : ''}`}
          onClick={() => setChatOpen(!chatOpen)}
          title={collapsed ? 'Chat' : undefined}
        >
          <MessageSquareCode size={18} strokeWidth={1.8} />
          {!collapsed && <span>Chat</span>}
          {!collapsed && snapshot?.cortexActive && (
            <span className="sidebar-active-dot" />
          )}
        </button>

        <button className="sidebar-collapse-btn" onClick={() => setCollapsed(v => !v)}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  )
}
