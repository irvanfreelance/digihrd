export interface EmployeeData {
  id: number
  employee_number: string
  full_name: string
  payroll_type: 'hourly' | 'monthly'
  base_salary: number
  hourly_rate: number | null
  overtime_rate_multiplier: number
  ptkp_status: string
}

export interface AttendanceSummary {
  working_days: number
  present_days: number
  absent_days: number
  late_count: number
  late_total_minutes: number
  total_work_hours: number
  overtime_hours: number
}

export interface SalaryComponentData {
  id: number
  name: string
  code: string
  component_type: 'earning_fixed' | 'earning_variable' | 'deduction_fixed' | 'deduction_variable' | 'tax' | 'bpjs'
  amount: number
  rate: number
  calculation_basis: string
}

export interface LateRuleData {
  deduction_method: 'none' | 'per_minute' | 'per_hour' | 'flat_cut'
  deduction_amount: number
  deduction_rate: number
  late_affects_payroll: boolean
  tolerance_minutes: number
}

export interface PayrollItemDetailResult {
  salary_component_id: number
  component_name: string
  component_type: string
  amount: number
  notes?: string
}

export interface PayrollItemResult {
  employee_id: number
  payroll_type: 'hourly' | 'monthly'
  working_days: number
  present_days: number
  absent_days: number
  late_count: number
  late_total_minutes: number
  total_work_hours: number
  overtime_hours: number
  base_salary: number
  total_earnings: number
  total_deductions: number
  total_bpjs_employee: number
  total_bpjs_company: number
  pph21: number
  net_salary: number
  details: PayrollItemDetailResult[]
}

/**
 * Pure payroll calculation engine (NO SQL)
 */
export function calculatePayrollItem(params: {
  employee: EmployeeData
  attendanceSummary: AttendanceSummary
  salaryComponents: SalaryComponentData[]
  lateRule?: LateRuleData | null
  periodYear: number
  periodMonth: number
}): PayrollItemResult {
  const { employee, attendanceSummary, salaryComponents, lateRule } = params
  const details: PayrollItemDetailResult[] = []

  let totalEarnings = 0
  let totalDeductions = 0
  let totalBpjsEmployee = 0
  let totalBpjsCompany = 0
  let pph21 = 0

  let baseSalary = Number(employee.base_salary) || 0

  // 1. Hourly vs Monthly Base Earning
  if (employee.payroll_type === 'hourly') {
    const hourlyRate = Number(employee.hourly_rate) || 0
    const regularWage = Math.round(attendanceSummary.total_work_hours * hourlyRate)
    baseSalary = regularWage
    totalEarnings += regularWage
    details.push({
      salary_component_id: 1,
      component_name: 'Upah Jam Reguler',
      component_type: 'earning_fixed',
      amount: regularWage,
      notes: `${attendanceSummary.total_work_hours} jam × Rp ${hourlyRate.toLocaleString('id-ID')}`
    })

    // Lembur hourly
    if (attendanceSummary.overtime_hours > 0) {
      const otMultiplier = Number(employee.overtime_rate_multiplier) || 1.5
      const otWage = Math.round(attendanceSummary.overtime_hours * hourlyRate * otMultiplier)
      totalEarnings += otWage
      details.push({
        salary_component_id: 4,
        component_name: 'Upah Lembur',
        component_type: 'earning_variable',
        amount: otWage,
        notes: `${attendanceSummary.overtime_hours} jam × rate × ${otMultiplier}`
      })
    }
  } else {
    // Monthly
    totalEarnings += baseSalary
    details.push({
      salary_component_id: 1,
      component_name: 'Gaji Pokok',
      component_type: 'earning_fixed',
      amount: baseSalary
    })

    // Potongan Absen
    if (attendanceSummary.absent_days > 0 && attendanceSummary.working_days > 0) {
      const dailyCut = Math.round((baseSalary / attendanceSummary.working_days) * attendanceSummary.absent_days)
      totalDeductions += dailyCut
      details.push({
        salary_component_id: 10,
        component_name: 'Potongan Absensi',
        component_type: 'deduction_variable',
        amount: dailyCut,
        notes: `${attendanceSummary.absent_days} hari absen`
      })
    }
  }

  // 2. Fixed & Variable Earnings from Components
  for (const comp of salaryComponents) {
    const compAmount = Number(comp.amount) || 0
    if (comp.component_type === 'earning_fixed' && comp.code !== 'GAJI_POKOK') {
      totalEarnings += compAmount
      details.push({
        salary_component_id: comp.id,
        component_name: comp.name,
        component_type: comp.component_type,
        amount: compAmount
      })
    } else if (comp.component_type === 'earning_variable' && comp.code !== 'LEMBUR') {
      totalEarnings += compAmount
      details.push({
        salary_component_id: comp.id,
        component_name: comp.name,
        component_type: comp.component_type,
        amount: compAmount
      })
    }
  }

  // 3. Potongan Keterlambatan
  if (lateRule && lateRule.late_affects_payroll && attendanceSummary.late_total_minutes > 0) {
    let lateCut = 0
    if (lateRule.deduction_method === 'per_minute') {
      lateCut = Math.round(attendanceSummary.late_total_minutes * Number(lateRule.deduction_amount || 0))
    } else if (lateRule.deduction_method === 'per_hour') {
      const hours = Math.ceil(attendanceSummary.late_total_minutes / 60)
      lateCut = Math.round(hours * Number(lateRule.deduction_amount || 0))
    } else if (lateRule.deduction_method === 'flat_cut') {
      lateCut = Math.round(attendanceSummary.late_count * Number(lateRule.deduction_amount || 0))
    }

    if (lateCut > 0) {
      totalDeductions += lateCut
      details.push({
        salary_component_id: 9,
        component_name: 'Potongan Keterlambatan',
        component_type: 'deduction_variable',
        amount: lateCut,
        notes: `${attendanceSummary.late_total_minutes} menit (${attendanceSummary.late_count}x telat)`
      })
    }
  }

  // 4. BPJS (Kesehatan: 1% kar, 4% pers; JHT: 2% kar, 3.7% pers; JP: 1% kar, 2% pers)
  const bpjsBase = baseSalary > 0 ? baseSalary : totalEarnings
  if (bpjsBase > 0) {
    const bpjsKesKar = Math.round(bpjsBase * 0.01)
    const bpjsJhtKar = Math.round(bpjsBase * 0.02)
    const bpjsJpKar = Math.round(bpjsBase * 0.01)

    totalBpjsEmployee = bpjsKesKar + bpjsJhtKar + bpjsJpKar
    totalBpjsCompany = Math.round(bpjsBase * 0.04) + Math.round(bpjsBase * 0.037) + Math.round(bpjsBase * 0.02)
    totalDeductions += totalBpjsEmployee

    details.push({
      salary_component_id: 5,
      component_name: 'BPJS Kesehatan (1%)',
      component_type: 'bpjs',
      amount: bpjsKesKar
    })
    details.push({
      salary_component_id: 6,
      component_name: 'BPJS Ketenagakerjaan JHT (2%)',
      component_type: 'bpjs',
      amount: bpjsJhtKar
    })
    details.push({
      salary_component_id: 7,
      component_name: 'BPJS Jaminan Pensiun (1%)',
      component_type: 'bpjs',
      amount: bpjsJpKar
    })
  }

  // 5. PPh 21 Estimasi (Sederhana berdasarkan PTKP TK/0 = 54jt/th)
  const annualGross = totalEarnings * 12
  let ptkp = 54000000
  if (employee.ptkp_status === 'K1') ptkp = 63000000
  else if (employee.ptkp_status === 'K2') ptkp = 67500000
  else if (employee.ptkp_status === 'K3') ptkp = 72000000

  if (annualGross > ptkp) {
    const taxableAnnual = annualGross - ptkp
    const annualTax = taxableAnnual * 0.05
    pph21 = Math.round(annualTax / 12)
    totalDeductions += pph21
    details.push({
      salary_component_id: 8,
      component_name: 'PPh 21',
      component_type: 'tax',
      amount: pph21
    })
  }

  const netSalary = Math.max(0, totalEarnings - totalDeductions)

  return {
    employee_id: employee.id,
    payroll_type: employee.payroll_type,
    working_days: attendanceSummary.working_days,
    present_days: attendanceSummary.present_days,
    absent_days: attendanceSummary.absent_days,
    late_count: attendanceSummary.late_count,
    late_total_minutes: attendanceSummary.late_total_minutes,
    total_work_hours: attendanceSummary.total_work_hours,
    overtime_hours: attendanceSummary.overtime_hours,
    base_salary: baseSalary,
    total_earnings: totalEarnings,
    total_deductions: totalDeductions,
    total_bpjs_employee: totalBpjsEmployee,
    total_bpjs_company: totalBpjsCompany,
    pph21,
    net_salary: netSalary,
    details
  }
}
