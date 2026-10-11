export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

export function terbilang(n: number): string {
  const angka = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas']
  n = Math.floor(n)
  if (n < 12) return angka[n]
  if (n < 20) return terbilang(n - 10) + ' Belas'
  if (n < 100) return terbilang(Math.floor(n / 10)) + ' Puluh ' + terbilang(n % 10)
  if (n < 200) return 'Seratus ' + terbilang(n - 100)
  if (n < 1000) return terbilang(Math.floor(n / 100)) + ' Ratus ' + terbilang(n % 100)
  if (n < 2000) return 'Seribu ' + terbilang(n - 1000)
  if (n < 1000000) return terbilang(Math.floor(n / 1000)) + ' Ribu ' + terbilang(n % 1000)
  if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + ' Juta ' + terbilang(n % 1000000)
  if (n < 1000000000000) return terbilang(Math.floor(n / 1000000000)) + ' Miliar ' + terbilang(n % 1000000000)
  return ''
}
