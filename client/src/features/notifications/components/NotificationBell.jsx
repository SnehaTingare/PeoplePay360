import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import Icon from '../../../shared/components/Icon/Icon'
import notificationsApi from '../api/notificationsApi'
import { notificationId, notificationTime } from '../notificationUtils'

export default function NotificationBell() {
  const buttonRef = useRef(null)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false); const [rows, setRows] = useState([]); const [unread, setUnread] = useState(0); const [error, setError] = useState(''); const [position, setPosition] = useState({ top: 76, right: 16 })
  const load = () => notificationsApi.list({ unread: true, page: 1, limit: 1 }).then((result) => { setRows(result.data); setUnread(result.meta.total); setError('') }).catch(() => setError('Unable to load notifications.'))
  const updatePosition = () => { const rect = buttonRef.current?.getBoundingClientRect(); if (rect) setPosition({ top: rect.bottom + 10, right: Math.max(16, window.innerWidth - rect.right) }) }
  useEffect(() => { load() }, [])
  useEffect(() => { if (!open) return undefined; updatePosition(); window.addEventListener('resize', updatePosition); window.addEventListener('scroll', updatePosition, true); return () => { window.removeEventListener('resize', updatePosition); window.removeEventListener('scroll', updatePosition, true) } }, [open])
  const close = () => setOpen(false)
  const openPanel = () => { close(); navigate('/notifications') }
  const preview = open && createPortal(<section className="notification-popover notification-popover--portal" aria-label="Unread notifications" style={position}><header><strong>Notifications</strong><button type="button" aria-label="Close notifications" onClick={close}><Icon name="close" size={16} /></button></header>{error && <p className="notification-error">{error}</p>}{!error && !rows.length && <p className="notification-empty">You’re all caught up.</p>}{rows.map((notification) => <article className={`notification-item notification-item--${notification.severity.toLowerCase()}`} key={notificationId(notification)}><div><strong>{notification.title}</strong><small>{notificationTime(notification.createdAt)}</small></div><p>{notification.message}</p></article>)}{unread > 1 && <button type="button" className="notification-see-more" onClick={openPanel}>See more notifications <Icon name="arrow" size={16} /></button>}</section>, document.body)
  return <div className="notification-bell"><button ref={buttonRef} className="bell-button icon-button" type="button" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open} onClick={() => { if (!open) load(); setOpen((current) => !current) }}><Icon name="notifications" size={19} />{unread > 0 && <b>{unread > 99 ? '99+' : unread}</b>}</button>{preview}</div>
}
