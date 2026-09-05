import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import notificationsApi from '../api/notificationsApi'
import { notificationId, notificationTime } from '../notificationUtils'

export default function NotificationBell() {
  const [open, setOpen] = useState(false); const [rows, setRows] = useState([]); const [unread, setUnread] = useState(0); const [error, setError] = useState('')
  const load = () => notificationsApi.list({ unread: true, page: 1, limit: 5 }).then((result) => { setRows(result.data); setUnread(result.meta.total); setError('') }).catch(() => setError('Unable to load notifications.'))
  useEffect(() => { load() }, [])
  const markRead = async (id) => { try { await notificationsApi.markRead(id); await load() } catch { setError('Unable to update notification.') } }
  return <div className="notification-bell"><button className="bell-button" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open} onClick={() => { setOpen(!open); if (!open) load() }}><span aria-hidden="true">!</span>{unread > 0 && <b>{unread > 99 ? '99+' : unread}</b>}</button>{open && <section className="notification-popover"><header><strong>Notifications</strong><Link to="/notifications" onClick={() => setOpen(false)}>View all</Link></header>{error && <p className="notification-error">{error}</p>}{!error && !rows.length && <p className="notification-empty">No unread notifications.</p>}{rows.map((notification) => <article className={`notification-item notification-item--${notification.severity.toLowerCase()}`} key={notificationId(notification)}><div><strong>{notification.title}</strong><small>{notificationTime(notification.createdAt)}</small></div><p>{notification.message}</p><button className="button-link" onClick={() => markRead(notificationId(notification))}>Mark read</button></article>)}</section>}</div>
}
