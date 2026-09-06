const paths = {
  dashboard: 'M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z',
  users: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3ZM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z',
  departments: 'M3 21h18v-2H3v2Zm2-4h4v-6H5v6Zm5 0h4V7h-4v10Zm5 0h4V3h-4v14Z',
  schedules: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 16H5V9h14v11ZM7 11h5v5H7z',
  search: 'M9.5 3a6.5 6.5 0 1 0 4.04 11.6L19.94 21 21 19.94l-6.4-6.4A6.5 6.5 0 0 0 9.5 3Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z',
  bell: 'M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6v-5a7 7 0 0 0-5-6.71V3a2 2 0 1 0-4 0v1.29A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z',
  sun: 'M6.76 4.84 5.35 3.43 3.93 4.85l1.41 1.41 1.42-1.42ZM1 13h3v-2H1v2Zm11-9h-1V1h2v3h-1Zm7.07.85-1.41-1.42-1.42 1.41 1.42 1.42 1.41-1.41ZM17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Zm2-1v2h3v-2h-3Zm-6 9h-2v3h2v-3Zm4.66-1.35-1.42 1.42 1.42 1.41 1.41-1.41-1.41-1.42ZM5.35 17.74l-1.42 1.41 1.42 1.42 1.41-1.42-1.41-1.41Z',
  moon: 'M20.6 15.79A8.7 8.7 0 0 1 8.21 3.4 8.71 8.71 0 1 0 20.6 15.79Z',
  logout: 'M10 17v-2h6.17l-2.59 2.59L15 19l5-5-5-5-1.42 1.41L16.17 13H10v-2H8v6h2ZM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5Z',
  menu: 'M3 18h18v-2H3v2Zm0-5h18v-2H3v2Zm0-7v2h18V6H3Z',

const icons = {
  workspace: Home, profile: UserRound, attendance: Clock3, timeOff: CalendarDays,
  payslips: ReceiptText, employees: UsersRound, schedules: CalendarClock,
  departments: Building2, users: UsersRound, contracts: BriefcaseBusiness,
  allocations: CalendarCheck2, timeOffTypes: ClipboardList, payroll: CircleDollarSign,
  dashboard: LayoutDashboard, payruns: CircleDollarSign, salaryStructures: Layers3,
  salaryRules: Settings2, notifications: Bell, key: KeyRound, logout: LogOut,
  menu: Menu, chevronDown: ChevronDown, close: X, success: CheckCircle2,
  arrow: ArrowRight, plus: Plus, search: Search, security: ShieldCheck,
}

export default function Icon({ name, size = 20, label, ...props }) {
  const Glyph = icons[name] || icons.dashboard
  return <Glyph className="icon" width={size} height={size} strokeWidth={1.9} aria-hidden={label ? undefined : true} aria-label={label} focusable="false" {...props} />
}
