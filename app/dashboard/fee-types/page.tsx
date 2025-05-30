// sfms/app/dashboard/fee-types/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useRef, Fragment } from 'react';
import toast from 'react-hot-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types';
import { useAuth } from '@/components/AuthContext';
import { Dialog, Transition, Switch } from '@headlessui/react';
import {
  XMarkIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  CogIcon,
  UsersIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

type Class = Database['public']['Tables']['classes']['Row'];
type Student = Database['public']['Tables']['students']['Row'];

type StudentForAssignment = Pick<Student, 'id' | 'name' | 'roll_no'>;

type FeeType = Database['public']['Tables']['fee_types']['Row'] & {
  classes?: Partial<Class>[];
};
type StudentFeeType = Database['public']['Tables']['student_fee_types']['Row'];

type AssignedStudentFeeTypeRef = Pick<StudentFeeType, 'id' | 'student_id'>;


const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const daysInMonth = (month: number, year: number) => {
  return new Date(year, month + 1, 0).getDate();
};

export default function FeeTypeManagement() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const {
    user,
    schoolId,
    isLoading: authLoading,
    isSchoolInfoLoading,
  } = useAuth();

  const [classes, setClasses] = useState<Class[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isClassesLoading, setIsClassesLoading] = useState(false);
  const [isFeeTypesLoading, setIsFeeTypesLoading] = useState(false);
  const [isSubmittingFee, setIsSubmittingFee] = useState(false);

  const [showManageClassesModal, setShowManageClassesModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  const currentMonthString = String(new Date().getMonth());
  const currentYearString = String(new Date().getFullYear());

  // Create Fee Modal States
  const [showCreateFeeModal, setShowCreateFeeModal] = useState(false);
  const [createFeeForm, setCreateFeeForm] = useState({
    name: '',
    description: '',
    default_amount: '',
    applicableFrom_day: '1',
    applicableFrom_month: currentMonthString,
    applicableFrom_year: currentYearString,
  });
  const [createFeeSelectedClassIds, setCreateFeeSelectedClassIds] = useState<string[]>([]);
  const [createApplicableFromEnabled, setCreateApplicableFromEnabled] = useState(false);

  // Edit Fee Modal States
  const [showEditFeeModal, setShowEditFeeModal] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeType | null>(null);
  const [editFeeForm, setEditFeeForm] = useState({
    name: '',
    description: '',
    default_amount: '',
    applicableFrom_day: '1',
    applicableFrom_month: currentMonthString,
    applicableFrom_year: currentYearString,
  });
  const [editFeeSelectedClassIds, setEditFeeSelectedClassIds] = useState<string[]>([]);
  const [editApplicableFromEnabled, setEditApplicableFromEnabled] = useState(false);

  // Assign Students Modal States
  const [showAssignStudentsModal, setShowAssignStudentsModal] = useState(false);
  const [feeTypeToAssign, setFeeTypeToAssign] = useState<FeeType | null>(null);
  const [selectedClassForAssignment, setSelectedClassForAssignment] = useState<string>('');
  const [studentsInSelectedClass, setStudentsInSelectedClass] = useState<StudentForAssignment[]>([]);
  const [selectedStudentIdsToAssign, setSelectedStudentIdsToAssign] = useState<string[]>([]);
  const [isAssigningStudents, setIsAssigningStudents] = useState(false);
  const [assignedStudentFeeTypes, setAssignedStudentFeeTypes] = useState<AssignedStudentFeeTypeRef[]>([]);
  
  // Filtered list of classes for the Assign Students modal
  const [filteredClassesForAssignStudents, setFilteredClassesForAssignStudents] = useState<Class[]>([]);


  // Helper to recalculate total_fees for a student (from master-ledger, adapted)
  const recalculateStudentTotalFees = useCallback(async (studentId: string, schoolId: string) => {
    // This function will fetch all fee types assigned to a student and sum their net_payable_amount
    const { data: studentFeeTypes, error } = await supabase
      .from('student_fee_types')
      .select(`
        assigned_amount, discount, net_payable_amount,
        fee_type: fee_types (default_amount)
      `)
      .eq('student_id', studentId)
      .eq('school_id', schoolId);

    if (error) {
      console.error('Error recalculating student fees:', error.message);
      return null;
    }

    let calculatedTotal = 0;
    studentFeeTypes?.forEach(sft => {
      const netPayable = sft.net_payable_amount ??
                         (sft.assigned_amount ?? sft.fee_type?.default_amount ?? 0) - (sft.discount ?? 0);
      calculatedTotal += netPayable;
    });

    // Update the students table with the new total_fees
    const { error: updateError } = await supabase
      .from('students')
      .update({ total_fees: calculatedTotal })
      .eq('id', studentId)
      .eq('school_id', schoolId);

    if (updateError) {
      console.error('Error updating student total_fees:', updateError.message);
      return null;
    }
    return calculatedTotal;
  }, [supabase]);


  const formatFullDate = (day: string, monthIndex: string, year: string): string | null => {
    const d = parseInt(day, 10);
    const m = parseInt(monthIndex, 10);
    const y = parseInt(year, 10);
    if (isNaN(d) || isNaN(m) || isNaN(y) || y < 1900 || y > 2200 || m < 0 || m > 11) return null;
    if (d < 1 || d > daysInMonth(m, y)) return null;
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const resetCreateFeeForm = () => {
    setCreateFeeForm({
      name: '',
      description: '',
      default_amount: '',
      applicableFrom_day: '1',
      applicableFrom_month: currentMonthString,
      applicableFrom_year: currentYearString,
    });
    setCreateFeeSelectedClassIds([]);
    setCreateApplicableFromEnabled(false);
    setShowCreateFeeModal(false);
  };

  const resetEditFeeForm = () => {
    setEditFeeForm({
      name: '',
      description: '',
      default_amount: '',
      applicableFrom_day: '1',
      applicableFrom_month: currentMonthString,
      applicableFrom_year: currentYearString,
    });
    setEditFeeSelectedClassIds([]);
    setEditingFee(null);
    setEditApplicableFromEnabled(false);
    setShowEditFeeModal(false);
  };

  const resetAssignStudentsModal = () => {
    setFeeTypeToAssign(null);
    setSelectedClassForAssignment('');
    setStudentsInSelectedClass([]);
    setSelectedStudentIdsToAssign([]);
    setAssignedStudentFeeTypes([]);
    setIsAssigningStudents(false);
    setShowAssignStudentsModal(false);
  };

  const fetchClasses = useCallback(async () => {
    if (!schoolId) { setClasses([]); return; }
    setIsClassesLoading(true);
    const { data, error } = await supabase.from('classes').select('*').eq('school_id', schoolId).order('name', { ascending: true });
    setIsClassesLoading(false);
    if (error) toast.error('Failed to load classes: ' + error.message);
    else setClasses(data || []);
  }, [supabase, schoolId]);

  const fetchFeeTypes = useCallback(async () => {
    if (!schoolId) { setFeeTypes([]); return; }
    setIsFeeTypesLoading(true);
    const { data: feeTypeData, error: feeTypeError } = await supabase
      .from('fee_types')
      .select(`*, fee_type_classes ( class: classes (id, name, school_id) )`)
      .eq('school_id', schoolId).order('name', { ascending: true });
    setIsFeeTypesLoading(false);
    if (feeTypeError) {
      toast.error(`Failed to load fee types: ${feeTypeError.message}`);
      setFeeTypes([]); return;
    }
    const enrichedFeeTypes: FeeType[] = (feeTypeData || []).map((ft) => ({
      ...ft,
      classes: ft.fee_type_classes?.map((link: any) => link.class).filter((cls: any) => cls && cls.school_id === schoolId) || [],
    }));
    setFeeTypes(enrichedFeeTypes);
  }, [supabase, schoolId]);

  useEffect(() => {
    if (user && schoolId && !authLoading && !isSchoolInfoLoading) {
      setIsPageLoading(true);
      Promise.all([fetchClasses(), fetchFeeTypes()]).finally(() => setIsPageLoading(false));
    } else {
      setIsPageLoading(authLoading || isSchoolInfoLoading);
      if (!authLoading && !isSchoolInfoLoading && !schoolId && user) {
        toast.error("School information not available for Fee Management.");
      }
    }
  }, [user, schoolId, authLoading, isSchoolInfoLoading, fetchClasses, fetchFeeTypes]);

  // Effect to filter classes for Assign Students Modal based on feeTypeToAssign.classes
  useEffect(() => {
    if (showAssignStudentsModal && feeTypeToAssign && classes.length > 0) {
      const applicableClassIds = new Set(feeTypeToAssign.classes?.map(c => c?.id).filter(Boolean) || []);
      const filtered = classes.filter(cls => applicableClassIds.has(cls.id));
      setFilteredClassesForAssignStudents(filtered);

      // If the currently selected class is no longer applicable, reset selection
      if (selectedClassForAssignment && !applicableClassIds.has(selectedClassForAssignment)) {
        setSelectedClassForAssignment('');
      }
    } else {
      setFilteredClassesForAssignStudents([]);
    }
  }, [showAssignStudentsModal, feeTypeToAssign, classes, selectedClassForAssignment]);


  // Effect for Assign Students Modal - Fetch students when class changes
  useEffect(() => {
    if (showAssignStudentsModal && selectedClassForAssignment && feeTypeToAssign && schoolId) {
      const fetchStudentsForClass = async () => {
        const { data, error } = await supabase
          .from('students')
          .select('id, name, roll_no')
          .eq('class_id', selectedClassForAssignment)
          .eq('school_id', schoolId)
          .order('name');
        if (error) {
          console.error('Failed to fetch students for class:', error.message);
          toast.error('Failed to load students for selected class.');
          setStudentsInSelectedClass([]);
        } else {
          setStudentsInSelectedClass(data || []);
        }
      };

      const fetchExistingAssignments = async () => {
        const { data, error } = await supabase
          .from('student_fee_types')
          .select('id, student_id')
          .eq('fee_type_id', feeTypeToAssign.id)
          .eq('school_id', schoolId);

        if (error) {
          console.error('Failed to fetch existing assignments:', error.message);
          setAssignedStudentFeeTypes([]);
        } else {
          setAssignedStudentFeeTypes(data || []);
          setSelectedStudentIdsToAssign(data?.map(sft => sft.student_id) || []);
        }
      };

      fetchStudentsForClass();
      fetchExistingAssignments();
    } else {
      setStudentsInSelectedClass([]);
      setSelectedStudentIdsToAssign([]);
      setAssignedStudentFeeTypes([]);
    }
  }, [showAssignStudentsModal, selectedClassForAssignment, feeTypeToAssign, schoolId, supabase]);


  const handleFormInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    formSetter: React.Dispatch<React.SetStateAction<any>>
  ) => {
    const { name, value } = e.target;
    formSetter((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSelectAllClasses = ( setFunc: React.Dispatch<React.SetStateAction<string[]>> ) => {
    setFunc(classes.map((c) => c.id));
  };

  const handleUnselectAllClasses = ( setFunc: React.Dispatch<React.SetStateAction<string[]>> ) => {
    setFunc([]);
  };

  const handleCheckboxToggle = ( id: string, currentIds: string[], setFunc: React.Dispatch<React.SetStateAction<string[]>> ) => {
    setFunc( currentIds.includes(id) ? currentIds.filter((cid) => cid !== id) : [...currentIds, id] );
  };

  const validateFeeForm = ( formToValidate: typeof createFeeForm | typeof editFeeForm ): boolean => {
    if (!formToValidate.name.trim()) {
      toast.error('Fee Type Name is required.'); return false;
    }
    if (formToValidate.default_amount && (isNaN(parseFloat(formToValidate.default_amount)) || parseFloat(formToValidate.default_amount) < 0) ) {
      toast.error('Default amount must be a valid non-negative number or empty.'); return false;
    }
    // Date validation is now conditional on toggle
    return true;
  };

  const handleAddClass = async () => {
    if (!newClassName.trim()) { toast.error('Class name cannot be empty.'); return; }
    if (!schoolId) { toast.error('School information unavailable.'); return; }

    setIsClassesLoading(true);

    try {
        const normalizedNewClassName = newClassName.trim();
        console.log("Attempting to add class:", normalizedNewClassName);

        const { data: existingClasses, error: fetchError } = await supabase
            .from('classes')
            .select('id, name')
            .eq('school_id', schoolId)
            .ilike('name', normalizedNewClassName)
            .maybeSingle();

        console.log("Supabase query result - data:", existingClasses, "error:", fetchError);

        if (fetchError) {
            throw fetchError;
        }

        if (existingClasses) {
            console.log(`Duplicate class found by query: ID ${existingClasses.id}, Name "${existingClasses.name}"`);
            toast.error(`Class "${normalizedNewClassName}" already exists. Please choose a different name.`);
            return;
        }

        const { data: insertedClass, error } = await supabase.from('classes').insert({ name: normalizedNewClassName, school_id: schoolId }).select().single();
        if (error) {
            throw error;
        }
        if (insertedClass) {
            toast.success(`Class "${insertedClass.name}" added successfully!`);
            setNewClassName('');
            fetchClasses();
        }
    } catch (error: any) {
        console.error('Error adding class:', error);
        toast.error(`Failed to add class: ${error.message || 'Unknown error'}`);
    } finally {
        setIsClassesLoading(false);
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!schoolId) { toast.error("School information not available."); return; }
    
    setIsClassesLoading(true);
    const { error: linkError } = await supabase.from('fee_type_classes').delete().eq('class_id', classId).eq('school_id', schoolId);
    if (linkError) { setIsClassesLoading(false); toast.error(`Failed to remove class links: ${linkError.message}. Class not deleted.`); return; }
    const { error } = await supabase.from('classes').delete().eq('id', classId).eq('school_id', schoolId);
    setIsClassesLoading(false);
    if (error) toast.error(`Failed to delete class "${className}": ${error.message}`);
    else { toast.success(`Class "${className}" deleted.`); fetchClasses(); fetchFeeTypes(); }
  };

  const submitFeeType = async () => {
    if (!validateFeeForm(createFeeForm)) return;
    if (!schoolId) { toast.error('School info unavailable.'); return; }

    let applicableFromDate: string | null = null;
    if (createApplicableFromEnabled) {
        applicableFromDate = formatFullDate(createFeeForm.applicableFrom_day, createFeeForm.applicableFrom_month, createFeeForm.applicableFrom_year);
        if (!applicableFromDate) { toast.error("Invalid 'Applicable From' date selected."); return; }
    }

    setIsSubmittingFee(true);
    const feeTypePayload: Database['public']['Tables']['fee_types']['Insert'] = {
      name: createFeeForm.name.trim(),
      description: createFeeForm.description.trim() || null,
      default_amount: createFeeForm.default_amount ? parseFloat(createFeeForm.default_amount) : 0,
      school_id: schoolId,
      applicable_from: applicableFromDate,
      applicable_until: null,
      scheduled_date: null,
    };
    const { data: newFeeType, error } = await supabase.from('fee_types').insert(feeTypePayload).select().single();
    if (error || !newFeeType) { setIsSubmittingFee(false); toast.error(`Failed to create fee type: ${error?.message || 'Unknown error'}`); return; }
    if (createFeeSelectedClassIds.length > 0) {
      const linkInsert = createFeeSelectedClassIds.map((class_id) => ({ fee_type_id: newFeeType.id, class_id, school_id: schoolId }));
      const { error: linkError } = await supabase.from('fee_type_classes').insert(linkInsert);
      if (linkError) toast.error(`Failed to link classes: ${linkError.message}`);
    }
    setIsSubmittingFee(false);
    toast.success('Fee type created!');
    fetchFeeTypes();
    resetCreateFeeForm();
  };

  const openEditFeeModal = (feeType: FeeType) => {
    if (feeType.school_id !== schoolId) { toast.error('Unauthorized action.'); return; }
    setEditingFee(feeType);
    let day = '1', month = currentMonthString, year = currentYearString;
    let applicableFromEnabled = false;

    if (feeType.applicable_from) {
        applicableFromEnabled = true;
        const dateParts = feeType.applicable_from.split('-');
        if (dateParts.length === 3) {
            year = dateParts[0];
            month = String(parseInt(dateParts[1], 10) - 1);
            day = String(parseInt(dateParts[2], 10));
        }
    }
    setEditFeeForm({
      name: feeType.name,
      description: feeType.description ?? '',
      default_amount: feeType.default_amount?.toString() ?? '0',
      applicableFrom_day: day,
      applicableFrom_month: month,
      applicableFrom_year: year,
    });
    setEditApplicableFromEnabled(applicableFromEnabled);
    setEditFeeSelectedClassIds(feeType.classes?.map((c) => c.id!).filter(Boolean) as string[] || []);
    setShowEditFeeModal(true);
  };

  const handleDuplicateFeeType = (feeType: FeeType) => {
    if (feeType.school_id !== schoolId) { toast.error('Unauthorized action.'); return; }
    let day = '1', month = currentMonthString, year = currentYearString;
    let applicableFromEnabled = false;

    if (feeType.applicable_from) {
        applicableFromEnabled = true;
        const dateParts = feeType.applicable_from.split('-');
        if (dateParts.length === 3) {
            year = dateParts[0];
            month = String(parseInt(dateParts[1], 10) - 1);
            day = String(parseInt(dateParts[2], 10));
        }
    }
    setCreateFeeForm({
      name: `Copy of ${feeType.name}`,
      description: feeType.description ?? '',
      default_amount: feeType.default_amount?.toString() ?? '0',
      applicableFrom_day: day,
      applicableFrom_month: month,
      applicableFrom_year: year,
    });
    setCreateApplicableFromEnabled(applicableFromEnabled);
    setCreateFeeSelectedClassIds(feeType.classes?.map((c) => c.id!).filter(Boolean) as string[] || []);
    setShowCreateFeeModal(true);
  };

  const updateFeeType = async () => {
    if (!editingFee || !validateFeeForm(editFeeForm) || !schoolId) return;
    if (editingFee.school_id !== schoolId) { toast.error('Unauthorized.'); resetEditFeeForm(); return; }

    let applicableFromDate: string | null = null;
    if (editApplicableFromEnabled) {
        applicableFromDate = formatFullDate(editFeeForm.applicableFrom_day, editFeeForm.applicableFrom_month, editFeeForm.applicableFrom_year);
        if (!applicableFromDate) { toast.error("Invalid 'Applicable From' date selected."); return; }
    }

    setIsSubmittingFee(true);
    const feeTypeUpdatePayload: Partial<Database['public']['Tables']['fee_types']['Update']> = {
      name: editFeeForm.name.trim(),
      description: editFeeForm.description.trim() || null,
      default_amount: editFeeForm.default_amount ? parseFloat(editFeeForm.default_amount) : 0,
      applicable_from: applicableFromDate,
    };
    const { error: updateError } = await supabase.from('fee_types').update(feeTypeUpdatePayload).eq('id', editingFee.id).eq('school_id', schoolId);
    if (updateError) { setIsSubmittingFee(false); toast.error(`Update failed: ${updateError.message}`); return; }

    await supabase.from('fee_type_classes').delete().eq('fee_type_id', editingFee.id).eq('school_id', schoolId);
    if (editFeeSelectedClassIds.length > 0) {
      const newLinks = editFeeSelectedClassIds.map((class_id) => ({ fee_type_id: editingFee.id, class_id, school_id: schoolId }));
      const { error: insertError } = await supabase.from('fee_type_classes').insert(newLinks);
      if (insertError) { console.error("Error updating class links:", insertError.message); }
    }
    setIsSubmittingFee(false);
    toast.success('Fee type updated!');
    fetchFeeTypes();
    resetEditFeeForm();
  };

  const deleteFeeType = async (feeType: FeeType) => {
    if (!schoolId || feeType.school_id !== schoolId) { toast.error('Unauthorized.'); return; }

    setIsSubmittingFee(true);
    const {error: sftError} = await supabase.from('student_fee_types').delete().eq('fee_type_id', feeType.id).eq('school_id', schoolId);
    if (sftError) { setIsSubmittingFee(false); toast.error(`Failed to dissociate from students: ${sftError.message}`); return; }
    await supabase.from('fee_type_classes').delete().eq('fee_type_id', feeType.id).eq('school_id', schoolId);
    const { error } = await supabase.from('fee_types').delete().eq('id', feeType.id).eq('school_id', schoolId);
    setIsSubmittingFee(false);
    if (error) toast.error(`Failed to delete fee type: ${error.message}`);
    else { toast.success('Fee type deleted.'); fetchFeeTypes(); }
  };

  const isCurrentlyApplicable = (feeType: FeeType): boolean => {
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    let isAfterFromOrNoFromDate = true;
    if (feeType.applicable_from) {
        const fromParts = String(feeType.applicable_from).split('-');
        if (fromParts.length === 3) {
            const fromDateUTC = new Date(Date.UTC(parseInt(fromParts[0]), parseInt(fromParts[1]) - 1, parseInt(fromParts[2])));
            if (!isNaN(fromDateUTC.getTime())) { isAfterFromOrNoFromDate = todayUTC >= fromDateUTC; }
            else { return false; }
        } else { return false; }
    }
    let isBeforeUntilOrNoUntilDate = true;
    if (feeType.applicable_until) {
        const untilParts = String(feeType.applicable_until).split('-');
        if (untilParts.length === 3) {
            const untilDateUTC = new Date(Date.UTC(parseInt(untilParts[0]), parseInt(untilParts[1]) - 1, parseInt(untilParts[2])));
            if (!isNaN(untilDateUTC.getTime())) { isBeforeUntilOrNoUntilDate = todayUTC <= untilDateUTC; }
            else { return false; }
        } else { return false; }
    }
    return isAfterFromOrNoFromDate && isBeforeUntilOrNoUntilDate;
  };

  const currentYearForPicker = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYearForPicker + i);
  const dayOptions = (monthIndex: number, year: number) => {
    if (isNaN(monthIndex) || isNaN(year)) return [1];
    return Array.from({ length: daysInMonth(monthIndex, year) }, (_, i) => i + 1);
  }

  // Handle Select All/Deselect All in Assign Students Modal
  const handleToggleSelectAllStudents = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIdsToAssign(studentsInSelectedClass.map(s => s.id));
    } else {
      setSelectedStudentIdsToAssign([]);
    }
  };

  // Handle individual student checkbox toggle in Assign Students Modal
  const handleToggleStudentSelection = (studentId: string) => {
    setSelectedStudentIdsToAssign(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleAssignStudentsToFee = async () => {
    if (!feeTypeToAssign || !schoolId || !selectedClassForAssignment) {
      toast.error("Invalid assignment data. Please select a fee type and class."); return;
    }

    setIsAssigningStudents(true);
    const toastId = toast.loading(`Assigning fee "${feeTypeToAssign.name}" to students...`);

    try {
        const feeTypeId = feeTypeToAssign.id;
        const defaultAssignedAmount = feeTypeToAssign.default_amount || 0;

        // Fetch existing assignments for this fee type and school
        const { data: currentAssignments, error: fetchAssignmentsError } = await supabase
            .from('student_fee_types')
            .select('id, student_id')
            .eq('fee_type_id', feeTypeId)
            .eq('school_id', schoolId);

        if (fetchAssignmentsError) throw fetchAssignmentsError;

        const currentAssignedStudentIds = new Set(currentAssignments?.map(a => a.student_id) || []);
        const selectedStudentIdsSet = new Set(selectedStudentIdsToAssign);

        const assignmentsToAdd: Database['public']['Tables']['student_fee_types']['Insert'][] = [];
        const assignmentsToDeleteIds: number[] = [];
        const studentsToRecalculateFees: Set<string> = new Set();

        // Determine what to add
        selectedStudentIdsSet.forEach(studentId => {
            if (!currentAssignedStudentIds.has(studentId)) {
                assignmentsToAdd.push({
                    student_id: studentId,
                    fee_type_id: feeTypeId,
                    school_id: schoolId,
                    assigned_amount: defaultAssignedAmount,
                    discount: 0,
                });
                studentsToRecalculateFees.add(studentId);
            }
        });

        // Determine what to delete
        currentAssignedStudentIds.forEach(studentId => {
            if (!selectedStudentIdsSet.has(studentId)) {
                const assignmentToDelete = currentAssignments?.find(a => a.student_id === studentId);
                if (assignmentToDelete) {
                    assignmentsToDeleteIds.push(assignmentToDelete.id);
                    studentsToRecalculateFees.add(studentId);
                }
            }
        });

        // Perform insertions
        if (assignmentsToAdd.length > 0) {
            const { error: insertError } = await supabase.from('student_fee_types').insert(assignmentsToAdd);
            if (insertError) throw insertError;
        }

        // Perform deletions
        if (assignmentsToDeleteIds.length > 0) {
            const { error: deleteError } = await supabase.from('student_fee_types').delete().in('id', assignmentsToDeleteIds);
            if (deleteError) throw deleteError;
        }

        // Recalculate total_fees for all affected students
        const recalculationPromises = Array.from(studentsToRecalculateFees).map(id =>
          recalculateStudentTotalFees(id, schoolId)
        );
        await Promise.all(recalculationPromises);


        toast.success(`Fee "${feeTypeToAssign.name}" assigned successfully!`, { id: toastId });
        resetAssignStudentsModal();
    } catch (error: any) {
        console.error('Error assigning students to fee:', error);
        toast.error(`Failed to assign students: ${error.message || 'Unknown error'}`, { id: toastId });
    } finally {
        setIsAssigningStudents(false);
    }
  };


  if (authLoading || isSchoolInfoLoading) {
    return <div className="p-6 text-center animate-pulse text-gray-500">Loading session and school information...</div>;
  }
  if (!user) {
    if (typeof window !== 'undefined') router.replace('/login');
    return <div className="p-6 text-center">Redirecting to login...</div>;
  }
  if (!schoolId) {
    return <div className="p-6 text-center text-red-500 bg-red-50 p-4 rounded-md">School information is not available. Please ensure your account is correctly set up. Fee & Class management features are disabled.</div>;
  }

  return (
    <div className="p-4 sm:p-6 bg-slate-100 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Fee & Class Management</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
                onClick={() => setShowManageClassesModal(true)}
                disabled={isPageLoading || isClassesLoading}
                className="flex items-center justify-center bg-purple-600 text-white px-4 py-2.5 rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75 disabled:bg-gray-300 transition-colors w-full sm:w-auto"
            >
                <CogIcon className="h-5 w-5 mr-2" /> Manage Classes
            </button>
            <button
              onClick={() => setShowCreateFeeModal(true)}
              disabled={isPageLoading || isSubmittingFee}
              className="flex items-center justify-center bg-indigo-600 text-white px-5 py-3 rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 disabled:bg-gray-300 transition-all duration-150 ease-in-out transform hover:scale-105 w-full sm:w-auto font-medium"
            >
              <PlusCircleIcon className="h-6 w-6 mr-2"/> Create New Fee Type
            </button>
        </div>
      </div>

      {(isPageLoading || (isFeeTypesLoading && feeTypes.length === 0)) && schoolId && (
        <div className="text-center py-10 text-gray-500 animate-pulse">Loading fee types and classes...</div>
      )}

      {!isPageLoading && !isFeeTypesLoading && feeTypes.length === 0 && schoolId && (
         <div className="text-center py-10 text-gray-500 bg-white p-6 rounded-xl shadow-lg">
             No fee types found for this school. Create one to get started.
         </div>
      )}

      {feeTypes.length > 0 && (
        <div className="overflow-x-auto bg-white shadow-xl rounded-lg">
          <table className="w-full border-collapse min-w-[900px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                <th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount (₹)</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Applicable From</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Classes</th>
                <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {feeTypes.map((fee) => (
                  <tr key={fee.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 whitespace-nowrap text-sm font-medium text-gray-900">{fee.name}</td>
                    <td className="p-3 text-sm text-gray-500 max-w-xs truncate" title={fee.description || undefined}>
                      {fee.description || '—'}
                    </td>
                    <td className="p-3 whitespace-nowrap text-sm text-gray-700 text-right">
                      {fee.default_amount != null ? fee.default_amount.toFixed(2) : '—'}
                    </td>
                    <td className="p-3 whitespace-nowrap text-sm text-gray-700">
                      {fee.applicable_from ? new Date(fee.applicable_from).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : 'Always'}
                    </td>
                    <td className="p-3 text-sm text-gray-700 max-w-xs truncate" title={fee.classes?.map((c) => c?.name).join(', ') || undefined}>
                      {fee.classes && fee.classes.length > 0 ? fee.classes.map((c) => c?.name).join(', ') : <span className="italic text-gray-400">All Classes</span>}
                    </td>
                    <td className="p-3 whitespace-nowrap text-sm">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          isCurrentlyApplicable(fee)
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {isCurrentlyApplicable(fee) ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap text-sm font-medium space-x-1 text-center">
                      <button onClick={() => handleDuplicateFeeType(fee)} disabled={isPageLoading || isSubmittingFee} className="text-sky-600 hover:text-sky-800 p-1 disabled:text-gray-400" title="Duplicate">
                        <DocumentDuplicateIcon className="h-5 w-5"/>
                      </button>
                      <button onClick={() => openEditFeeModal(fee)} disabled={isPageLoading || isSubmittingFee} className="text-indigo-600 hover:text-indigo-800 p-1 disabled:text-gray-400" title="Edit">
                        <PencilSquareIcon className="h-5 w-5"/>
                      </button>
                      <button onClick={() => { setFeeTypeToAssign(fee); setShowAssignStudentsModal(true); }} disabled={isPageLoading || isSubmittingFee} className="text-blue-600 hover:text-blue-800 p-1 disabled:text-gray-400" title="Assign to Students">
                        <UsersIcon className="h-5 w-5"/>
                      </button>
                      <button onClick={() => deleteFeeType(fee)} disabled={isPageLoading || isSubmittingFee} className="text-red-600 hover:text-red-800 p-1 disabled:text-gray-400" title="Delete Fee Type">
                        <TrashIcon className="h-5 w-5"/>
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manage Classes Modal */}
      <Transition appear show={showManageClassesModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowManageClassesModal(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black bg-opacity-40" /></Transition.Child>
          <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 flex justify-between items-center">Manage Classes<button onClick={() => setShowManageClassesModal(false)} className="p-1 rounded-full hover:bg-gray-200"><XMarkIcon className="h-5 w-5 text-gray-500"/></button></Dialog.Title>
              <div className="mt-4">
                <div className="flex items-stretch gap-2 mb-4">
                  <input type="text" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="New Class Name" disabled={isClassesLoading} className="flex-grow border border-gray-300 rounded-lg px-3 py-2.5 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"/>
                  <button onClick={handleAddClass} disabled={isClassesLoading || !newClassName.trim()} className="bg-green-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 disabled:bg-gray-400 flex items-center justify-center transition-colors duration-150 ease-in-out font-medium">
                    <PlusCircleIcon className="h-5 w-5 mr-2"/> Add
                  </button>
                </div>
                {isClassesLoading && classes.length === 0 && <p className="text-sm text-gray-500">Loading classes...</p>}
                {!isClassesLoading && classes.length === 0 && <p className="text-sm text-gray-500 italic">No classes created yet.</p>}
                {/* NEW TEXT FOR EXISTING CLASSES */}
                {!isClassesLoading && classes.length > 0 && <h4 className="text-sm font-medium text-gray-700 mb-2">Existing Classes:</h4>}
                {classes.length > 0 && (<div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1 bg-slate-50">
                    {classes.map(cls => (<div key={cls.id} className="flex justify-between items-center p-1.5 hover:bg-gray-100 group rounded">
                        <span className="text-sm text-gray-700">{cls.name}</span>
                        <button onClick={() => handleDeleteClass(cls.id, cls.name)} disabled={isClassesLoading} className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Class"><TrashIcon className="h-4 w-4"/></button>
                    </div>))}
                </div>)}
              </div>
              <div className="mt-5 text-right"><button type="button" onClick={() => setShowManageClassesModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2">Done</button></div>
            </Dialog.Panel>
          </Transition.Child></div></div>
        </Dialog>
      </Transition>

      {/* Create and Edit Fee Modals (combined for conciseness) */}
      {[
        { show: showCreateFeeModal, form: createFeeForm, setForm: setCreateFeeForm, selectedIds: createFeeSelectedClassIds, setSelectedIds: setCreateFeeSelectedClassIds, reset: resetCreateFeeForm, submit: submitFeeType, title: "Create New Fee Type", submitText: "Create Fee Type", submittingText: "Creating...", applicableFromEnabled: createApplicableFromEnabled, setApplicableFromEnabled: setCreateApplicableFromEnabled, isEdit: false },
        { show: showEditFeeModal, form: editFeeForm, setForm: setEditFeeForm, selectedIds: editFeeSelectedClassIds, setSelectedIds: setEditFeeSelectedClassIds, reset: resetEditFeeForm, submit: updateFeeType, title: `Edit Fee Type: ${editingFee?.name || 'N/A'}`, submitText: "Save Changes", submittingText: "Saving...", applicableFromEnabled: editApplicableFromEnabled, setApplicableFromEnabled: setEditApplicableFromEnabled, isEdit: true }
      ].map((modalProps, idx) => (
        modalProps.show && (
          <Transition key={idx} appear show={modalProps.show} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={modalProps.reset}>
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black bg-opacity-40" /></Transition.Child>
              <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900 flex justify-between items-center">{modalProps.title}<button onClick={modalProps.reset} className="p-1 rounded-full hover:bg-gray-200"><XMarkIcon className="h-5 w-5 text-gray-500"/></button></Dialog.Title>
                  <form onSubmit={(e) => { e.preventDefault(); modalProps.submit(); }} className="mt-5 space-y-5">
                    <div>
                      <label htmlFor={`${idx}-fee-name`} className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                      <input id={`${idx}-fee-name`} name="name" value={modalProps.form.name} onChange={(e) => handleFormInputChange(e, modalProps.setForm)} disabled={isSubmittingFee} className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"/>
                    </div>
                    <div>
                      <label htmlFor={`${idx}-fee-description`} className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea id={`${idx}-fee-description`} name="description" value={modalProps.form.description} onChange={(e) => handleFormInputChange(e, modalProps.setForm)} disabled={isSubmittingFee} rows={4} className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"/>
                    </div>
                    <div>
                      <label htmlFor={`${idx}-fee-default_amount`} className="block text-sm font-medium text-gray-700 mb-1">Default Amount (₹)</label>
                      <input id={`${idx}-fee-default_amount`} name="default_amount" value={modalProps.form.default_amount} onChange={(e) => handleFormInputChange(e, modalProps.setForm)} disabled={isSubmittingFee} type="number" step="0.01" placeholder="e.g., 500.00" className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"/>
                    </div>
                    {/* Applicable From Toggle */}
                    <div className="flex items-center justify-between mb-2">
                        <label htmlFor={`${idx}-applicable-from-toggle`} className="block text-sm font-medium text-gray-700">Set specific &apos;Applicable From&apos; date?</label>
                        <Switch
                            checked={modalProps.applicableFromEnabled}
                            onChange={modalProps.setApplicableFromEnabled}
                            disabled={isSubmittingFee}
                            className={`${modalProps.applicableFromEnabled ? 'bg-indigo-600' : 'bg-gray-200'}
                            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                        >
                            <span className="sr-only">Enable Applicable From Date</span>
                            <span
                            className={`${modalProps.applicableFromEnabled ? 'translate-x-5' : 'translate-x-0'}
                                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                            />
                        </Switch>
                    </div>
                    {modalProps.applicableFromEnabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Applicable From</label>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                          <select name="applicableFrom_month" value={modalProps.form.applicableFrom_month} onChange={(e) => handleFormInputChange(e, modalProps.setForm)} disabled={isSubmittingFee} className="col-span-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3">
                            {MONTH_NAMES.map((month, index) => <option key={index} value={String(index)}>{month}</option>)}
                          </select>
                          <select name="applicableFrom_day" value={modalProps.form.applicableFrom_day} onChange={(e) => handleFormInputChange(e, modalProps.setForm)} disabled={isSubmittingFee} className="col-span-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3">
                            {dayOptions(parseInt(modalProps.form.applicableFrom_month), parseInt(modalProps.form.applicableFrom_year)).map(day => <option key={day} value={String(day)}>{day}</option>)}
                          </select>
                          <select name="applicableFrom_year" value={modalProps.form.applicableFrom_year} onChange={(e) => handleFormInputChange(e, modalProps.setForm)} disabled={isSubmittingFee} className="col-span-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3">
                            {yearOptions.map(year => <option key={year} value={String(year)}>{year}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                    <fieldset className="border rounded-md p-3">
                      <legend className="text-sm font-semibold px-1 text-gray-700">Assign to Classes</legend>
                       <div className="my-1 flex space-x-2">
                          <button type="button" onClick={() => handleSelectAllClasses(modalProps.setSelectedIds)} disabled={isSubmittingFee || classes.length === 0} className="text-xs text-indigo-600 hover:underline disabled:text-gray-400">Select All</button>
                          <button type="button" onClick={() => handleUnselectAllClasses(modalProps.setSelectedIds)} disabled={isSubmittingFee} className="text-xs text-indigo-600 hover:underline disabled:text-gray-400">Unselect All</button>
                        </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto border p-2 rounded-md bg-gray-50">
                        {classes.length > 0 ? classes.map((cls) => (
                          <label key={cls.id} className="flex items-center p-1.5 hover:bg-indigo-50 rounded cursor-pointer">
                            <input type="checkbox" checked={modalProps.selectedIds.includes(cls.id)} onChange={() => handleCheckboxToggle(cls.id, modalProps.selectedIds, modalProps.setSelectedIds)} disabled={isSubmittingFee} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-offset-0 focus:ring-2 focus:ring-indigo-500 mr-2.5"/>
                            <span className="text-sm text-gray-800">{cls.name}</span>
                          </label>
                        )) : <p className="text-xs text-gray-500 italic">No classes available. Add classes via &quot;Manage Classes&quot;.</p>}
                      </div>
                    </fieldset>
                    <div className="mt-6 flex justify-end space-x-3">
                      <button type="button" onClick={modalProps.reset} disabled={isSubmittingFee} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-200">Cancel</button>
                      <button type="submit" disabled={isSubmittingFee} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300">
                        {isSubmittingFee ? modalProps.submittingText : modalProps.submitText}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child></div></div>
            </Dialog>
          </Transition>
        ))
      )}

      {/* Assign Students Modal */}
      <Transition appear show={showAssignStudentsModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={resetAssignStudentsModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900 flex justify-between items-center pb-4 border-b">
                    Assign Fee: <span className="text-indigo-700 ml-2">{feeTypeToAssign?.name}</span>
                    <button onClick={resetAssignStudentsModal} className="p-1 rounded-full hover:bg-gray-200">
                      <XMarkIcon className="h-5 w-5 text-gray-500" />
                    </button>
                  </Dialog.Title>

                  <div className="mt-5 space-y-6">
                    <div>
                      <label htmlFor="assign-class-select" className="block text-sm font-medium text-gray-700 mb-1">
                        Select Class
                      </label>
                      <select
                        id="assign-class-select"
                        value={selectedClassForAssignment}
                        onChange={(e) => setSelectedClassForAssignment(e.target.value)}
                        disabled={isAssigningStudents}
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 bg-white disabled:bg-gray-100"
                      >
                        <option value="">-- Choose a Class --</option>
                        {/* Filter classes based on feeTypeToAssign.classes */}
                        {filteredClassesForAssignStudents.map(cls => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                      {(filteredClassesForAssignStudents.length === 0 && feeTypeToAssign?.classes?.length === 0) && (
                        <p className="text-sm text-gray-500 mt-2">This fee type is not applicable to any classes. Please edit the fee type to assign it to classes first.</p>
                      )}
                      {filteredClassesForAssignStudents.length === 0 && (feeTypeToAssign?.classes?.length || 0) > 0 && (
                        <p className="text-sm text-gray-500 mt-2">No matching classes found.</p>
                      )}
                    </div>

                    {selectedClassForAssignment && (
                      <fieldset className="border rounded-md p-3 pb-0 space-y-3">
                        <legend className="text-sm font-semibold px-1 text-gray-700">Students in {classes.find(c => c.id === selectedClassForAssignment)?.name}</legend>
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
                          <label className="flex items-center text-sm font-medium text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedStudentIdsToAssign.length === studentsInSelectedClass.length && studentsInSelectedClass.length > 0}
                              onChange={(e) => handleToggleSelectAllStudents(e.target.checked)}
                              disabled={isAssigningStudents || studentsInSelectedClass.length === 0}
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mr-2"
                            />
                            Select All Students
                          </label>
                          <span className="text-xs text-gray-500">({selectedStudentIdsToAssign.length} selected)</span>
                        </div>

                        {studentsInSelectedClass.length === 0 ? (
                          <p className="text-sm text-gray-500 italic py-2">No students found in this class.</p>
                        ) : (
                          <div className="max-h-60 overflow-y-auto pr-2">
                            {studentsInSelectedClass.map(student => (
                              <label key={student.id} className="flex items-center p-1.5 hover:bg-indigo-50 rounded cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={selectedStudentIdsToAssign.includes(student.id)}
                                  onChange={() => handleToggleStudentSelection(student.id)}
                                  disabled={isAssigningStudents}
                                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mr-2.5"
                                />
                                <span className="text-sm text-gray-800 flex-grow">
                                  {student.name} <span className="text-gray-500 text-xs">({student.roll_no})</span>
                                </span>
                                {selectedStudentIdsToAssign.includes(student.id) && (
                                  <CheckIcon className="h-4 w-4 text-indigo-600 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </label>
                            ))}
                          </div>
                        )}
                      </fieldset>
                    )}
                  </div>

                  <div className="mt-8 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={resetAssignStudentsModal}
                      disabled={isAssigningStudents}
                      className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAssignStudentsToFee}
                      disabled={isAssigningStudents || !selectedClassForAssignment || selectedStudentIdsToAssign.length === 0}
                      className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
                    >
                      {isAssigningStudents ? 'Assigning...' : 'Assign Fee'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}