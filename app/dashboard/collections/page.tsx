// app/dashboard/collections/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { Database } from '@/lib/database.types';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import {
  CalendarDaysIcon,
  CurrencyDollarIcon, // Keep for potential use, but won't hardcode '$'
  ChartBarIcon,
  RectangleGroupIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline';

// Type for classes for the filter dropdown
type ClassType = Pick<Database['public']['Tables']['classes']['Row'], 'id' | 'name'>;


export default function CollectionsPage() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const { user, schoolId, isLoading: authLoading, isSchoolInfoLoading } = useAuth();

  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [collectionsData, setCollectionsData] = useState<any[]>([]); // To be populated later
  const [totalCollectedAmount, setTotalCollectedAmount] = useState(0);

  // Filter states
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); //YYYY-MM-DD
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4>(Math.floor(new Date().getMonth() / 3) + 1 as 1 | 2 | 3 | 4);
  const [selectedClassFilter, setSelectedClassFilter] = useState(''); // State for class filter
  const [classes, setClasses] = useState<ClassType[]>([]); // State for classes


  // Fetch classes for the dropdown
  const fetchClasses = useCallback(async () => {
    if (!schoolId) {
      setClasses([]);
      return;
    }
    try {
      const { data, error } = await supabase.from('classes').select('id, name').eq('school_id', schoolId).order('name');
      if (error) {
        toast.error('Failed to load classes: ' + error.message);
      } else {
        setClasses(data || []);
      }
    } catch (error: any) {
      toast.error('An error occurred while loading classes: ' + error.message);
    }
  }, [supabase, schoolId]);


  const fetchCollections = useCallback(async () => {
    if (!schoolId) {
      setCollectionsData([]);
      setTotalCollectedAmount(0);
      setIsLoadingPage(false);
      return;
    }

    setIsLoadingPage(true);
    let startDate: string | null = null;
    let endDate: string | null = null;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-11

    switch (timePeriod) {
      case 'daily':
        startDate = selectedDate;
        endDate = selectedDate;
        break;
      case 'weekly':
        const selectedDay = new Date(selectedDate);
        const dayOfWeek = selectedDay.getDay(); // 0 (Sunday) to 6 (Saturday)
        const diff = selectedDay.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust to Monday of current week
        startDate = new Date(selectedDay.setDate(diff)).toISOString().split('T')[0];
        endDate = new Date(selectedDay.setDate(selectedDay.getDate() + 6)).toISOString().split('T')[0];
        break;
      case 'monthly':
        startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
        break;
      case 'quarterly':
        let quarterStartMonth = (selectedQuarter - 1) * 3 + 1;
        startDate = `${selectedYear}-${String(quarterStartMonth).padStart(2, '0')}-01`;
        let quarterEndMonth = quarterStartMonth + 2;
        let lastDayOfQuarterMonth = new Date(selectedYear, quarterEndMonth, 0).getDate();
        endDate = `${selectedYear}-${String(quarterEndMonth).padStart(2, '0')}-${String(lastDayOfQuarterMonth).padStart(2, '0')}`;
        break;
      case 'yearly':
        startDate = `${selectedYear}-01-01`;
        endDate = `${selectedYear}-12-31`;
        break;
    }

    try {
      let query = supabase
        .from('payments')
        .select(`
          amount_paid, date, mode_of_payment, description, receipt_number,
          students(name, roll_no, classes(name, id))
        `)
        .eq('school_id', schoolId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      // Apply class filter if selected
      if (selectedClassFilter) {
        query = query.eq('students.class_id', selectedClassFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const total = data.reduce((sum, p) => sum + p.amount_paid, 0);
      setCollectionsData(data);
      setTotalCollectedAmount(total);

    } catch (error: any) {
      console.error('Failed to fetch collections:', error.message);
      toast.error(`Failed to load collections: ${error.message}`);
      setCollectionsData([]);
      setTotalCollectedAmount(0);
    } finally {
      setIsLoadingPage(false);
    }
  }, [supabase, schoolId, timePeriod, selectedDate, selectedMonth, selectedYear, selectedQuarter, selectedClassFilter]);

  useEffect(() => {
    if (user && schoolId && !authLoading && !isSchoolInfoLoading) {
      fetchClasses(); // Fetch classes once auth is ready
      fetchCollections();
    } else if (!authLoading && !isSchoolInfoLoading && (!user || !schoolId)) {
      setIsLoadingPage(false);
    }
  }, [user, schoolId, authLoading, isSchoolInfoLoading, fetchCollections, fetchClasses]);

  if (authLoading || (isSchoolInfoLoading && !schoolId && user)) {
    return <div className="p-6 text-center animate-pulse text-gray-500">Loading collections module...</div>;
  }
  if (!user) {
    router.replace('/login');
    return <div className="p-6 text-center">Redirecting to login...</div>;
  }
  if (!schoolId && !isSchoolInfoLoading) {
    return <div className="p-6 text-center text-red-500 bg-red-50 p-4 rounded-md">School information unavailable. Collection features disabled.</div>;
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i); // Current year +/- 2
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, name: new Date(0, i).toLocaleString('en-US', { month: 'long' }) }));

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6">Fee Collections Report</h1>

        <div className="bg-white shadow-xl rounded-xl p-6 mb-8 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label htmlFor="timePeriod" className="block text-sm font-medium text-gray-700 mb-1">View By:</label>
              <select
                id="timePeriod"
                className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value as any)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {timePeriod === 'daily' && (
              <div>
                <label htmlFor="selectedDate" className="block text-sm font-medium text-gray-700 mb-1">Select Date:</label>
                <input
                  type="date"
                  id="selectedDate"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>
            )}

            {timePeriod === 'weekly' && (
              <div>
                <label htmlFor="selectedWeek" className="block text-sm font-medium text-gray-700 mb-1">Select a day in Week:</label>
                <input
                  type="date"
                  id="selectedWeek"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>
            )}

            {(timePeriod === 'monthly' || timePeriod === 'quarterly' || timePeriod === 'yearly') && (
              <div>
                <label htmlFor="selectedYear" className="block text-sm font-medium text-gray-700 mb-1">Select Year:</label>
                <select
                  id="selectedYear"
                  className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  {yearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            )}

            {timePeriod === 'monthly' && (
              <div>
                <label htmlFor="selectedMonth" className="block text-sm font-medium text-gray-700 mb-1">Select Month:</label>
                <select
                  id="selectedMonth"
                  className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                >
                  {monthOptions.map(month => (
                    <option key={month.value} value={month.value}>{month.name}</option>
                  ))}
                </select>
              </div>
            )}

            {timePeriod === 'quarterly' && (
              <div>
                <label htmlFor="selectedQuarter" className="block text-sm font-medium text-gray-700 mb-1">Select Quarter:</label>
                <select
                  id="selectedQuarter"
                  className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(parseInt(e.target.value) as 1 | 2 | 3 | 4)}
                >
                  <option value={1}>Q1 (Jan-Mar)</option>
                  <option value={2}>Q2 (Apr-Jun)</option>
                  <option value={3}>Q3 (Jul-Sep)</option>
                  <option value={4}>Q4 (Oct-Dec)</option>
                </select>
              </div>
            )}

            {/* Class Filter */}
            <div>
              <label htmlFor="classFilter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Class:</label>
              <select
                id="classFilter"
                className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                disabled={classes.length === 0 && !isLoadingPage}
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
              {classes.length === 0 && !isLoadingPage && <p className="text-xs text-gray-500 mt-1">No classes found.</p>}
            </div>

          </div>
        </div>

        {/* Collection Summary */}
        <div className="bg-white shadow-xl rounded-xl p-6 mb-8 border border-gray-100 flex items-center justify-between">
          <div className="flex items-center">
            {/* Using CurrencyDollarIcon for general financial icon, but displaying ₹ */}
            <CurrencyDollarIcon className="h-10 w-10 text-green-600 mr-4" />
            <div>
              <p className="text-lg font-medium text-gray-500">Total Collected in Period:</p>
              {isLoadingPage ? (
                <div className="h-8 w-40 bg-gray-200 animate-pulse rounded-md mt-1"></div>
              ) : (
                <p className="text-4xl font-extrabold text-green-700">₹{totalCollectedAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              )}
            </div>
          </div>
          {/* Optional: Add some charts here later */}
        </div>

        {/* Detailed Collections Table */}
        <div className="bg-white shadow-xl rounded-xl p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Detailed Payments</h2>
          {isLoadingPage ? (
            <div className="text-center py-10 text-gray-500">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-6"></div>
              <p className="text-xl font-medium">Fetching payments...</p>
            </div>
          ) : collectionsData.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <CalendarDaysIcon className="h-20 w-20 text-gray-300 mx-auto mb-6" />
              <p className="text-lg font-medium mb-2">No payments found for this period.</p>
              <p className="text-md text-gray-500">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Student Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Class</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Amount (₹)</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Mode</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Receipt #</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {collectionsData.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(payment.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.students?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {payment.students?.classes?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right font-semibold">
                        ₹{payment.amount_paid.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">
                        {payment.mode_of_payment.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">
                        {payment.receipt_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate"
                        title={payment.description || undefined}
                      >
                        {payment.description || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}