import httpClient from '../../../shared/api/httpClient'

const payslipApi = {
  list: (params) => httpClient.get('/payroll/payslips', { params }).then((response) => response.data),
  mine: (params) => httpClient.get('/payroll/payslips/me', { params }).then((response) => response.data),
  get: (id) => httpClient.get(`/payroll/payslips/${id}`).then((response) => response.data.data),
  pdf: (id) => httpClient.get(`/payroll/payslips/${id}/pdf`, { responseType: 'blob' }).then((response) => response),
}

export async function downloadPayslipPdf(id) {
  const response = await payslipApi.pdf(id)
  const disposition = response.headers['content-disposition'] || ''
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || `payslip-${id}.pdf`
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default payslipApi
