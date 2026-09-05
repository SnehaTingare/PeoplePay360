export const notificationId = (value) => String(value?._id || value?.id || '')
export const notificationTime = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : ''
