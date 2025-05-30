// app/page.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import {
  ArrowRightIcon,
  UserPlusIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  CreditCardIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  LightBulbIcon,
  CurrencyDollarIcon,
  CheckBadgeIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

export default function HomePage() {
  const { user, isLoading, schoolId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && schoolId) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, schoolId, router]);

  if (isLoading || (user && !schoolId && !isLoading)) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 to-purple-500 p-4">
        <div className="text-white text-xl animate-pulse flex items-center">
          <BuildingLibraryIcon className="h-10 w-10 mr-3 animate-bounce" /> Loading your experience...
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center min-h-screen bg-white text-gray-800 antialiased">
      {/* Hero Section */}
      <section className="relative w-full py-32 px-6 sm:px-10 lg:px-16 text-center bg-gradient-to-br from-indigo-700 to-indigo-900 text-white overflow-hidden shadow-2xl">
        <div className="max-w-6xl mx-auto z-10 relative space-y-8">
          <BuildingLibraryIcon className="h-28 w-28 text-indigo-300 mx-auto opacity-90 mb-4 drop-shadow-md" />
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-tight tracking-tight drop-shadow-lg">
            Master School Finances. Elevate Education.
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl font-light opacity-90 max-w-4xl mx-auto leading-relaxed">
            SFMS is the all-in-one platform designed to simplify complex fee management, streamline administration,
            and provide crystal-clear financial insights for every educational institution.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-5 pt-8">
            <Link
              href="/signup"
              className="px-12 py-5 bg-white text-indigo-800 rounded-full shadow-xl hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 ease-in-out font-bold text-xl flex items-center justify-center min-w-[250px]"
            >
              Start Your Free Trial <UserPlusIcon className="ml-3 h-7 w-7"/>
            </Link>
            <Link
              href="/login"
              className="px-12 py-5 bg-indigo-600 text-white rounded-full shadow-xl hover:bg-indigo-700 transform hover:scale-105 transition-all duration-300 ease-in-out font-bold text-xl flex items-center justify-center min-w-[250px]"
            >
              Existing School Login <ArrowRightIcon className="ml-3 h-7 w-7"/>
            </Link>
          </div>
        </div>
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-indigo-500 rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-600 rounded-full opacity-10 blur-3xl"></div>
        </div>
      </section>

      {/* Why SFMS Section */}
      <section className="w-full py-24 px-6 sm:px-10 lg:px-16 bg-white">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Why SFMS Is Your School&apos;s Next Essential Tool {/* FIX: Escaped apostrophe here */}
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-16 leading-relaxed">
            In today&apos;s dynamic educational landscape, efficient financial management is paramount. SFMS provides the robust solutions you need to thrive. {/* FIX: Escaped apostrophe here */}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            <ValueCard
              icon={<ClockIcon className="h-12 w-12 text-blue-600" />}
              title="Save Time & Resources"
              description="Automate repetitive tasks, reduce paperwork, and free up your staff to focus on what truly matters: education."
            />
            <ValueCard
              icon={<CurrencyDollarIcon className="h-12 w-12 text-green-600" />}
              title="Enhance Financial Clarity"
              description="Gain real-time insights into every financial transaction, ensuring accuracy, transparency, and informed decision-making."
            />
            <ValueCard
              icon={<CheckBadgeIcon className="h-12 w-12 text-purple-600" />}
              title="Boost Operational Efficiency"
              description="Streamline workflows from admissions to reporting, creating a more cohesive and productive administrative environment."
            />
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section className="w-full py-24 px-6 sm:px-10 lg:px-16 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-center text-gray-900 mb-16 leading-tight">
            Unleash the Power of Comprehensive Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <FeatureDetailCard
              icon={<CreditCardIcon className="h-12 w-12 text-indigo-600" />}
              title="Advanced Fee Lifecycle Management"
              details={[
                "Flexible fee type creation (tuition, transport, exam, etc.)",
                "Effortless assignment of fees to individual students or entire classes",
                "Automated due date tracking and reminders",
                "Comprehensive discount application with detailed descriptions",
                "Real-time calculation of net payable amounts."
              ]}
            />
            <FeatureDetailCard
              icon={<AcademicCapIcon className="h-12 w-12 text-green-600" />}
              title="Seamless Student & Class Administration"
              details={[
                "Centralized student profiles with academic year and roll number tracking",
                "Intuitive class management and student assignment",
                "Status tracking (active, passed out, withdrawn) for accurate records",
                "Quick lookup and retrieval of student information."
              ]}
            />
            <FeatureDetailCard
              icon={<ClipboardDocumentListIcon className="h-12 w-12 text-red-600" />}
              title="Robust Payment Processing & History"
              details={[
                "Diverse payment modes (cash, UPI, bank transfer, cheque, online portal)",
                "Automated or manual receipt number generation",
                "Instant payment recording and balance updates",
                "Detailed ledger entries for every transaction",
                "Comprehensive payment history for each student and across the entire school."
              ]}
            />
            <FeatureDetailCard
              icon={<ChartBarIcon className="h-12 w-12 text-purple-600" />}
              title="Dynamic Reporting & Insights"
              details={[
                "Dashboard overview of total assigned, collected, and outstanding fees",
                "Breakdowns by class, academic year, and fee type",
                "Exportable data (CSV, PDF) for external analysis and auditing",
                "Identify financial trends and potential areas for improvement."
              ]}
            />
          </div>
        </div>
      </section>

      {/* Call to Action Section (Repeated for emphasis) */}
      <section className="w-full py-24 px-6 sm:px-10 lg:px-16 bg-gradient-to-br from-teal-600 to-cyan-700 text-white text-center shadow-lg">
        <div className="max-w-5xl mx-auto space-y-8">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight drop-shadow-md">
            Ready to Experience the SFMS Difference?
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl opacity-90 max-w-4xl mx-auto leading-relaxed">
            It&apos;s time to focus more on education, less on paperwork. {/* FIX: Escaped apostrophe here */}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-5 pt-6">
            <Link
              href="/signup"
              className="px-12 py-5 bg-white text-teal-800 rounded-full shadow-xl hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 ease-in-out font-bold text-xl flex items-center justify-center min-w-[250px]"
            >
              Start Your Free Trial <UserPlusIcon className="ml-3 h-7 w-7"/>
            </Link>
            <Link
              href="/login"
              className="px-12 py-5 bg-teal-500 text-white rounded-full shadow-xl hover:bg-teal-600 transform hover:scale-105 transition-all duration-300 ease-in-out font-bold text-xl flex items-center justify-center min-w-[250px]"
            >
              Already a User? Login <ArrowRightIcon className="ml-3 h-7 w-7"/>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12 px-6 sm:px-10 bg-gray-900 text-gray-400 text-center text-sm">
        <div className="max-w-6xl mx-auto space-y-2">
          <p className="font-semibold text-lg text-gray-300 mb-2">School Fee Management System (SFMS)</p>
          <p className="opacity-80">
            Dedicated to simplifying financial administration for educational institutions.
          </p>
          <p className="mt-4">&copy; {new Date().getFullYear()} SFMS. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

// Helper Component for "Why SFMS" Section
interface ValueCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ValueCard: React.FC<ValueCardProps> = ({ icon, title, description }) => (
  <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 flex flex-col items-center text-center hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out">
    <div className="flex items-center justify-center p-4 rounded-full bg-blue-50 mb-6">{icon}</div>
    <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </div>
);

// Helper Component for "Core Features" Section
interface FeatureDetailCardProps {
  icon: React.ReactNode;
  title: string;
  details: string[];
}

const FeatureDetailCard: React.FC<FeatureDetailCardProps> = ({ icon, title, details }) => (
  <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out">
    <div className="flex items-center space-x-4 mb-6">
      <div className="flex-shrink-0 flex items-center justify-center p-4 rounded-full bg-indigo-50">{icon}</div>
      <h3 className="text-2xl font-semibold text-gray-900 leading-tight">{title}</h3>
    </div>
    <ul className="list-none space-y-3 text-gray-700">
      {details.map((detail, index) => (
        <li key={index} className="flex items-start text-lg">
          <CheckBadgeIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
          <span>{detail}</span>
        </li>
      ))}
    </ul>
  </div>
);
//