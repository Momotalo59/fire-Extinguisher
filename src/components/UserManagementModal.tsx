import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Shield, User, Search, RefreshCw, X, Check, AlertCircle, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { getAllUserProfiles, updateUserRole } from '../lib/dbHelpers';

interface UserManagementModalProps {
  currentUserEmail: string;
  onClose: () => void;
}

export default function UserManagementModal({ currentUserEmail, onClose }: UserManagementModalProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Admin' | 'Inspector'>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load all user profiles
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const userList = await getAllUserProfiles();
      setUsers(userList);
    } catch (err: any) {
      console.error("Error loading users:", err);
      setErrorMessage("ไม่สามารถโหลดรายชื่อผู้ใช้งานได้: " + (err.message || 'เกิดข้อผิดพลาด'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle Role Change
  const handleRoleChange = async (userToUpdate: UserProfile, newRole: 'Admin' | 'Inspector') => {
    if (userToUpdate.role === newRole) return;

    try {
      setUpdatingUid(userToUpdate.uid);
      setErrorMessage(null);

      await updateUserRole(userToUpdate.uid, newRole, currentUserEmail);

      // Update local state
      setUsers(prev => prev.map(u => u.uid === userToUpdate.uid ? { ...u, role: newRole } : u));
      
      setToastMessage(`ปรับสิทธิ์ของ ${userToUpdate.fullName || userToUpdate.email} เป็น ${newRole} สำเร็จ`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error("Error updating user role:", err);
      setErrorMessage("ไม่สามารถเปลี่ยนสิทธิ์ได้: " + (err.message || 'เกิดข้อผิดพลาด'));
    } finally {
      setUpdatingUid(null);
    }
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || 
      (u.fullName && u.fullName.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.department && u.department.toLowerCase().includes(term));

    return matchesRole && matchesSearch;
  });

  const adminCount = users.filter(u => u.role === 'Admin').length;
  const inspectorCount = users.filter(u => u.role === 'Inspector').length;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-100"
      >
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-600/40 text-red-500 flex items-center justify-center shadow-inner">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <span>จัดการสิทธิ์ผู้ใช้งาน (User Roles)</span>
                <span className="text-[10px] font-bold bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded-full">
                  Admin Only
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                ปรับเปลี่ยนระดับสิทธิ์การเข้าถึงของผู้ใช้งานในระบบ (Admin / Inspector)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Toast Notification */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-md"
              >
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-400 shrink-0" />
                  <span>{toastMessage}</span>
                </div>
                <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white cursor-pointer">
                  <X size={14} />
                </button>
              </motion.div>
            )}

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-md"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white cursor-pointer">
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls Bar: Search & Role Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="ค้นหาตามชื่อ, อีเมล หรือแผนก..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Role Filter Tabs */}
            <div className="flex items-center gap-1.5 shrink-0 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setRoleFilter('All')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  roleFilter === 'All' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ทั้งหมด ({users.length})
              </button>
              <button
                onClick={() => setRoleFilter('Admin')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  roleFilter === 'Admin' ? 'bg-red-950 text-red-300 border border-red-800/80 shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield size={12} />
                <span>Admin ({adminCount})</span>
              </button>
              <button
                onClick={() => setRoleFilter('Inspector')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  roleFilter === 'Inspector' ? 'bg-sky-950 text-sky-300 border border-sky-800/80 shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User size={12} />
                <span>Inspector ({inspectorCount})</span>
              </button>
            </div>
          </div>

          {/* Users Table / Card List */}
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <RefreshCw size={24} className="animate-spin mx-auto text-red-500" />
              <p className="text-xs font-medium">กำลังโหลดรายชื่อผู้ใช้งานจากฐานข้อมูล...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2 bg-slate-950/40 rounded-xl border border-slate-800/50">
              <Users size={32} className="mx-auto text-slate-700" />
              <p className="text-xs font-bold text-slate-400">ไม่พบข้อมูลผู้ใช้งานที่ตรงตามเงื่อนไข</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredUsers.map((u) => {
                const isSelf = u.email === currentUserEmail;
                const isUpdating = updatingUid === u.uid;

                return (
                  <div
                    key={u.uid}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      u.role === 'Admin'
                        ? 'bg-slate-950/90 border-red-900/40 hover:border-red-800/60'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* User Info */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-white truncate">{u.fullName || 'ไม่ได้ระบุชื่อ'}</span>
                        {isSelf && (
                          <span className="text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded-md">
                            (บัญชีของคุณ)
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                          u.role === 'Admin'
                            ? 'bg-red-950 text-red-400 border-red-800/60'
                            : 'bg-sky-950 text-sky-400 border-sky-800/60'
                        }`}>
                          {u.role === 'Admin' ? <Shield size={11} /> : <User size={11} />}
                          <span>{u.role}</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <p className="font-mono text-slate-300">{u.email}</p>
                        <p><strong>แผนก:</strong> {u.department || '-'}</p>
                        {u.lastLogin && (
                          <p className="text-[10px] text-slate-500 font-mono">
                            เข้าสู่ระบบล่าสุด: {new Date(u.lastLogin).toLocaleDateString('th-TH', {
                              day: '2-digit',
                              month: 'short',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })} น.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Role Control Selector */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">ปรับสิทธิ์:</span>
                      <div className="inline-flex bg-slate-900 p-1 rounded-lg border border-slate-800 gap-1">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleRoleChange(u, 'Inspector')}
                          className={`py-1 px-2.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            u.role === 'Inspector'
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          <User size={12} />
                          <span>Inspector</span>
                        </button>

                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleRoleChange(u, 'Admin')}
                          className={`py-1 px-2.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            u.role === 'Admin'
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          <Shield size={12} />
                          <span>Admin</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0 text-xs">
          <p className="text-slate-400">
            💡 ผู้ดูแลระบบ (Admin) สามารถปรับเปลี่ยนสิทธิ์ของผู้ใช้งานในองค์กรได้ตลอดเวลา
          </p>
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </motion.div>
    </div>
  );
}
