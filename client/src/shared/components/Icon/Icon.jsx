import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Home,
  KeyRound,
  Layers3,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'

const icons = {
  workspace: Home,
  profile: UserRound,
  attendance: Clock3,
  timeOff: CalendarDays,
  payslips: ReceiptText,
  employees: UsersRound,
  schedules: CalendarClock,
  departments: Building2,
  users: UsersRound,
  contracts: BriefcaseBusiness,
  allocations: CalendarCheck2,
  timeOffTypes: ClipboardList,
  payroll: CircleDollarSign,
  dashboard: LayoutDashboard,
  payruns: CircleDollarSign,
  salaryStructures: Layers3,
  salaryRules: Settings2,
  notifications: Bell,
  key: KeyRound,
  logout: LogOut,
  menu: Menu,
  chevronDown: ChevronDown,
  close: X,
  success: CheckCircle2,
  arrow: ArrowRight,
  plus: Plus,
  search: Search,
  security: ShieldCheck,
}

export default function Icon({ name, size = 20, label, ...props }) {
  const Glyph = icons[name] || icons.dashboard

  return (
    <Glyph
      className="icon"
      width={size}
      height={size}
      strokeWidth={1.9}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      focusable="false"
      {...props}
    />
  )
}
