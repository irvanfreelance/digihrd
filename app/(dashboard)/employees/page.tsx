'use client'

import * as React from 'react'
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  DollarSign
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DataTable, Column, FilterOption } from '@/components/ui/DataTable'
import { formatIDR } from '@/lib/utils/currency'

export default function EmployeesListPage() {
  const [employees, setEmployees] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  const loadEmployees = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/employees?limit=200')
      const json = await res.json()
      setEmployees(json.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadEmployees()
  }, [])

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Nonaktifkan karyawan ${name}?`)) return
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadEmployees()
      } else {
        alert('Gagal menghapus karyawan')
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Multi-filter options derived dynamically from data
  const departmentOptions = React.useMemo(() => {
    const set = new Set(employees.map(e => e.department_name).filter(Boolean))
    return Array.from(set).map(d => ({ label: d, value: d }))
  }, [employees])

  const payrollTypeOptions = [
    { label: 'Bulanan (Monthly)', value: 'monthly' },
    { label: 'Per Jam (Hourly)', value: 'hourly' }
  ]

  const roleOptions = [
    { label: 'Employee', value: 'employee' },
    { label: 'HR Admin', value: 'hr_admin' },
    { label: 'HR Staff', value: 'hr_staff' },
    { label: 'Supervisor', value: 'supervisor' }
  ]

  const filters: FilterOption[] = [
    { key: 'department_name', label: 'Departemen', options: departmentOptions },
    { key: 'payroll_type', label: 'Skema Gaji', options: payrollTypeOptions },
    { key: 'role', label: 'Role Akses', options: roleOptions }
  ]

  const columns: Column<any>[] = [
    {
      key: 'employee_number',
      header: 'NIK / ID',
      render: (emp) => <span className="font-semibold text-xs font-mono">{emp.employee_number}</span>
    },
    {
      key: 'full_name',
      header: 'Nama Karyawan',
      render: (emp) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white text-sm">{emp.full_name}</div>
          <div className="text-xs text-slate-400">{emp.email}</div>
        </div>
      )
    },
    {
      key: 'position_name',
      header: 'Jabatan & Departemen',
      render: (emp) => (
        <div className="text-xs">
          <div className="font-medium text-slate-800 dark:text-slate-200">{emp.position_name}</div>
          <div className="text-slate-400">{emp.department_name}</div>
        </div>
      )
    },
    {
      key: 'location_name',
      header: 'Lokasi Kerja',
      render: (emp) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {emp.location_name || 'Kantor Pusat'}
        </span>
      )
    },
    {
      key: 'payroll_type',
      header: 'Skema Gaji',
      render: (emp) => (
        <Badge variant="outline" className="text-[10px] uppercase font-bold">
          {emp.payroll_type}
        </Badge>
      )
    },
    {
      key: 'base_salary',
      header: 'Tarif / Gaji Pokok',
      render: (emp) => (
        <span className="text-xs font-semibold">
          {emp.payroll_type === 'hourly'
            ? `${formatIDR(Number(emp.hourly_rate || 0))} / jam`
            : formatIDR(Number(emp.base_salary || 0))}
        </span>
      )
    },
    {
      key: 'role',
      header: 'Role Akses',
      render: (emp) => (
        <Badge variant={emp.role?.includes('admin') ? 'default' : 'secondary'} className="text-[10px] capitalize">
          {emp.role?.replace('_', ' ')}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      render: (emp) => (
        <div className="space-x-1 whitespace-nowrap">
          <Link href={`/employees/${emp.id}/salary`}>
            <Button size="sm" variant="ghost" className="p-1.5 text-blue-600" title="Atur Komponen Gaji">
              <DollarSign className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/employees/${emp.id}`}>
            <Button size="sm" variant="ghost" className="p-1.5 text-slate-600 dark:text-slate-300" title="Edit Biodata">
              <Edit className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className="p-1.5 text-red-600"
            title="Nonaktifkan"
            onClick={() => handleDelete(emp.id, emp.full_name)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-heading">
            Daftar Data Karyawan
          </h1>
          <p className="text-sm text-slate-500">
            Master biodata pegawai, penempatan kerja, jabatan, dan struktur kompensasi
          </p>
        </div>
        <Link href="/employees/new">
          <Button variant="brand" className="gap-2">
            <UserPlus className="w-4 h-4" />
            Tambah Karyawan Baru
          </Button>
        </Link>
      </div>

      <DataTable
        data={employees}
        columns={columns}
        searchPlaceholder="Cari nama, NIK, email, jabatan..."
        searchKeys={['full_name', 'employee_number', 'email', 'position_name', 'department_name']}
        filters={filters}
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50, 100]}
        showRowNumber={true}
        loading={loading}
      />
    </div>
  )
}
