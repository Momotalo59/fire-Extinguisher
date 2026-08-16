import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { 
  Flame, 
  Mail, 
  Lock, 
  UserPlus, 
  LogIn, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  User, 
  Briefcase, 
  Shield,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';

interface AuthScreenProps {
  onSuccess?: () => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const { theme, toggleTheme } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sign up details
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<'Admin' | 'Inspector'>('Inspector');

  // Pre-configured Test Users list (2 Admin + 2 Inspector)
  const testAccounts = [
    {
      role: 'Admin' as const,
      email: 'admin1@overbrook.com',
      password: 'password123',
      fullName: 'ธนวัฒน์ อินตายวง (Admin 1)',
      department: 'แผนกช่างเทคนิคควบคุมระบบ',
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/40',
      description: 'สิทธิ์เต็ม: จัดการถังดับเพลิง เพิ่ม/แก้ไข/ลบ ออกรายงาน และจัดการระบบ'
    },
    {
      role: 'Admin' as const,
      email: 'admin2@overbrook.com',
      password: 'password123',
      fullName: 'วิศรุต อุปถัมภ์ (Admin 2)',
      department: 'ฝ่ายบริหารความปลอดภัยอาคาร',
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/40',
      description: 'สิทธิ์เต็ม: ดูแลระบบภาพรวม ตรวจสอบสถิติ และออกรายงาน PDF'
    },
    {
      role: 'Inspector' as const,
      email: 'inspector1@overbrook.com',
      password: 'password123',
      fullName: 'สมชาย รักความปลอดภัย (Inspector 1)',
      department: 'แผนกป้องกันและบรรเทาสาธารณภัย',
      badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
      description: 'สิทธิ์ผู้ตรวจ: สแกน QR Code ตรวจสภาพถัง และบันทึกผลการตรวจเช็ค'
    },
    {
      role: 'Inspector' as const,
      email: 'inspector2@overbrook.com',
      password: 'password123',
      fullName: 'สมหญิง ตรวจเช็คดี (Inspector 2)',
      department: 'แผนกอาคารและสถานที่',
      badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
      description: 'สิทธิ์ผู้ตรวจ: สแกน QR Code ตรวจสภาพถัง และบันทึกผลการตรวจเช็ค'
    }
  ];

  // Helper for 1-click Quick Test Login
  const handleQuickLogin = async (acc: typeof testAccounts[0]) => {
    setLoading(true);
    setError(null);
    try {
      let userCredential;
      try {
        // Try to sign in first
        userCredential = await signInWithEmailAndPassword(auth, acc.email, acc.password);
      } catch (signInErr: any) {
        // If account doesn't exist yet, auto-create it in Firebase Auth
        if (
          signInErr.code === 'auth/user-not-found' ||
          signInErr.code === 'auth/invalid-credential' ||
          signInErr.code === 'auth/wrong-password'
        ) {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, acc.email, acc.password);
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              // Try signing in with default password if created previously
              userCredential = await signInWithEmailAndPassword(auth, acc.email, acc.password);
            } else {
              throw createErr;
            }
          }
        } else {
          throw signInErr;
        }
      }

      if (userCredential) {
        // Ensure user profile in Firestore has exact test role, name, and department
        await saveUserProfile(userCredential.user.uid, acc.email, {
          fullName: acc.fullName,
          department: acc.department,
          role: acc.role
        });
        onSuccess?.();
      }
    } catch (err: any) {
      console.error("Quick test login error:", err);
      setError(`ไม่สามารถเข้าสู่ระบบด้วยบัญชีทดสอบได้: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };



  // Helper to sync user profile with Firestore database
  const saveUserProfile = async (
    uid: string, 
    userEmail: string, 
    additionalData: { fullName?: string; department?: string; role?: string }
  ) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      const now = new Date().toISOString();

      if (!userDoc.exists()) {
        // Create new user profile document
        await setDoc(userDocRef, {
          uid,
          email: userEmail,
          fullName: additionalData.fullName || userEmail.split('@')[0],
          department: additionalData.department || 'แผนกความปลอดภัยทั่วไป',
          role: additionalData.role || 'Inspector',
          isActive: true,
          lastLogin: now
        });
        console.log("Successfully created database profile for", uid);
      } else {
        // Update existing user profile's lastLogin and merge other fields if provided
        await setDoc(userDocRef, {
          lastLogin: now,
          isActive: true,
          ...(additionalData.fullName ? { fullName: additionalData.fullName } : {}),
          ...(additionalData.department ? { department: additionalData.department } : {}),
          ...(additionalData.role ? { role: additionalData.role } : {})
        }, { merge: true });
        console.log("Successfully updated database login status for", uid);
      }
    } catch (dbErr) {
      console.error("Failed to sync profile to database:", dbErr);
      // We don't want to throw and block login, but we'll log it
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }
    if (password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (isSignUp) {
      if (!confirmPassword) {
        setError('กรุณายืนยันรหัสผ่านของคุณ');
        return;
      }
      if (password !== confirmPassword) {
        setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
        return;
      }
      if (!fullName || !department) {
        setError('กรุณากรอกชื่อ-นามสกุลจริง และแผนก/ฝ่ายของคุณ');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          // Save user profile info to users collection in Firestore (Default role: Inspector)
          await saveUserProfile(userCredential.user.uid, email, {
            fullName,
            department,
            role: 'Inspector'
          });
        } catch (signUpErr: any) {
          if (signUpErr.code === 'auth/email-already-in-use') {
            console.log("Email already exists in Firebase Auth. Attempting to sign in with password provided...");
            try {
              // Attempt to sign in with the credentials entered on the sign up form
              const userCredential = await signInWithEmailAndPassword(auth, email, password);
              // Save the profile info to the users collection in the current Firestore database
              await saveUserProfile(userCredential.user.uid, email, {
                fullName,
                department,
                role: 'Inspector'
              });
            } catch (signInErr: any) {
              console.log("Signing in with entered password failed. Attempting to sign in with default password 'firesafe123' to link profile...");
              try {
                // Attempt to sign in with the default password 'firesafe123'
                const userCredential = await signInWithEmailAndPassword(auth, email, 'firesafe123');
                // Save the profile info to the users collection in the current Firestore database
                await saveUserProfile(userCredential.user.uid, email, {
                  fullName,
                  department,
                  role: 'Inspector'
                });
              } catch (defaultPwdErr: any) {
                // If both failed, throw a custom error to indicate password mismatch for an existing account
                throw new Error('EMAIL_ALREADY_IN_USE_WRONG_PASSWORD');
              }
            }
          } else {
            throw signUpErr;
          }
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Update user profile login time in Firestore
        await saveUserProfile(userCredential.user.uid, email, {});
      }
      onSuccess?.();
    } catch (err: any) {
      console.error("Auth error:", err);
      let friendlyMessage = err.message;
      if (err.message === 'EMAIL_ALREADY_IN_USE_WRONG_PASSWORD') {
        friendlyMessage = 'อีเมลนี้ถูกลงทะเบียนไว้ในระบบ Firebase แล้ว แต่รหัสผ่านที่คุณระบุไม่ถูกต้อง และไม่สามารถลงชื่อเข้าใช้ด้วยรหัสผ่านตั้งต้น "firesafe123" ได้ กรุณาสลับไปยังหน้า "เข้าสู่ระบบ" และกรอกรหัสผ่านที่ถูกต้องสำหรับอีเมลนี้ หรือใช้ฟังก์ชันรีเซ็ตรหัสผ่าน';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        friendlyMessage = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      } else if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'อีเมลนี้ถูกลงทะเบียนใช้งานในระบบแล้ว กรุณาสลับไปยังหน้าเข้าสู่ระบบเพื่อลงชื่อใช้งาน';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = 'รหัสผ่านไม่ปลอดภัยเพียงพอ (ต้องมี 6 ตัวอักษรขึ้นไป)';
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      
      {/* Floating Theme Switcher Button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white shadow-lg backdrop-blur-sm transition-all cursor-pointer text-xs font-bold"
          title={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง (Light Mode)' : 'เปลี่ยนเป็นโหมดมืด (Dark Mode)'}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={16} className="text-amber-400" />
              <span>โหมดสว่าง</span>
            </>
          ) : (
            <>
              <Moon size={16} className="text-indigo-400" />
              <span>โหมดมืด</span>
            </>
          )}
        </button>
      </div>

      {/* Decorative abstract background lines */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-950/20 via-slate-950 to-slate-950 pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-red-600/20">
            <Flame size={32} className="animate-pulse" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          Safety Management System
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400 font-semibold tracking-wider uppercase">
          ระบบบริหารจัดการและตรวจสอบอุปกรณ์ความปลอดภัย
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl relative z-10 px-4">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          
          {/* Sign In / Sign Up tab selector */}
          <div className="flex border-b border-slate-800 pb-4 mb-6">
            <button
              onClick={() => { setIsSignUp(false); setError(null); setPassword(''); setConfirmPassword(''); }}
              className={`flex-1 text-center pb-2.5 text-sm font-bold transition-colors cursor-pointer ${
                !isSignUp 
                  ? 'text-red-500 border-b-2 border-red-500 font-extrabold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              เข้าสู่ระบบ (Sign In)
            </button>
            <button
              onClick={() => { setIsSignUp(true); setError(null); setPassword(''); setConfirmPassword(''); }}
              className={`flex-1 text-center pb-2.5 text-sm font-bold transition-colors cursor-pointer ${
                isSignUp 
                  ? 'text-red-500 border-b-2 border-red-500 font-extrabold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              สมัครสมาชิกใหม่
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleAuth}>
            
            {/* If Sign Up mode, show real-name, department, and role fields linked to database schema */}
            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 overflow-hidden pb-2"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    ชื่อ-นามสกุลจริง (Full Name) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User size={16} />
                    </div>
                    <input
                      type="text"
                      required={isSignUp}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="เช่น นายสมชาย รักความปลอดภัย"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    แผนก/ฝ่าย (Department) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Briefcase size={16} />
                    </div>
                    <input
                      type="text"
                      required={isSignUp}
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="เช่น แผนกช่างเทคนิคควบคุมระบบ"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950/80 border border-sky-900/40 rounded-xl text-slate-300 text-[11px] flex items-start gap-2.5 shadow-inner">
                  <Shield size={16} className="text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sky-300">สิทธิ์การใช้งานเริ่มต้น: Inspector (ผู้ตรวจสอบ)</p>
                    <p className="text-slate-400 text-[10px] leading-relaxed mt-0.5">
                      ผู้ลงทะเบียนใหม่ทุกคนจะได้รับสิทธิ์ <strong className="text-sky-300">Inspector</strong> สำหรับสแกน QR Code และบันทึกผลการตรวจเช็คถังดับเพลิง หากต้องการสิทธิ์ Admin (ผู้ดูแลระบบ) สามารถแจ้งให้ผู้ดูแลระบบเดิมปรับเปลี่ยนสิทธิ์ให้ท่านได้ในระบบ
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                ที่อยู่อีเมล (Email Address) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                รหัสผ่าน (Password) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {!isSignUp && (
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email) {
                        setError('กรุณากรอกอีเมลของคุณในช่องด้านบนก่อน แล้วกดปุ่ม "ลืมรหัสผ่าน" อีกครั้ง เพื่อส่งลิงก์กู้คืนรหัสผ่าน');
                        return;
                      }
                      setLoading(true);
                      setError(null);
                      try {
                        const { sendPasswordResetEmail } = await import('firebase/auth');
                        await sendPasswordResetEmail(auth, email);
                        setError('ระบบได้ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณเรียบร้อยแล้ว โปรดตรวจสอบกล่องข้อความหรือกล่องจดหมายขยะ (Spam)');
                      } catch (resetErr: any) {
                        console.error("Reset password error:", resetErr);
                        let friendlyResetMessage = resetErr.message;
                        if (resetErr.code === 'auth/user-not-found') {
                          friendlyResetMessage = 'ไม่พบข้อมูลผู้ใช้นี้ในระบบ Auth';
                        } else if (resetErr.code === 'auth/invalid-email') {
                          friendlyResetMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
                        }
                        setError('ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้: ' + friendlyResetMessage);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="text-[11px] font-semibold text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    ลืมรหัสผ่าน? (Forgot Password)
                  </button>
                </div>
              )}
            </div>

            {/* Confirm Password Field (Only for Sign Up mode) */}
            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  ยืนยันรหัสผ่าน (Confirm Password) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required={isSignUp}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านอีกครั้งเพื่อยืนยัน"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </motion.div>
            )}

            {error && (
              <div className="p-3 bg-red-950/80 border border-red-900/50 rounded-xl text-red-200 text-xs flex flex-col gap-2 animate-shake">
                <div className="flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
                  <span className="leading-relaxed font-medium">{error}</span>
                </div>
                {isSignUp && error.includes('ลงทะเบียน') && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setError(null);
                      setConfirmPassword('');
                      setPassword('');
                    }}
                    className="self-start text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    สลับไปยังหน้า "เข้าสู่ระบบ" ทันที
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-500 text-white py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
            >
              {isSignUp ? <UserPlus size={16} /> : <LogIn size={16} />}
              <span>{loading ? 'กำลังดำเนินการ...' : isSignUp ? 'บันทึกข้อมูลและสมัครสมาชิก' : 'เข้าสู่ระบบความปลอดภัย'}</span>
            </button>
          </form>

          {/* Quick Demo Test Accounts Section */}
          <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="text-red-500 shrink-0" size={18} />
                <h3 className="text-xs sm:text-sm font-extrabold text-white">บัญชีผู้ใช้สำหรับทดสอบระบบ (2 ระดับ • 4 Users)</h3>
              </div>
              <span className="text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-800/80 px-2.5 py-1 rounded-full">
                คลิกเพื่อเข้าสู่ระบบทันที
              </span>
            </div>
            <p className="text-xs text-slate-400">
              ท่านสามารถคลิกปุ่ม <strong className="text-slate-200">"เข้าสู่ระบบด่วน"</strong> บนการ์ดด้านล่าง เพื่อทดสอบใช้งานระบบในแต่ละสิทธิ์ได้โดยไม่ต้องกรอกรหัสผ่าน:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {testAccounts.map((acc, idx) => (
                <div
                  key={acc.email}
                  className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5 hover:border-slate-700 transition-all shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${acc.badgeColor}`}>
                        {acc.role === 'Admin' ? '🛡️ Admin (ผู้ดูแลระบบ)' : '🔍 Inspector (ผู้ตรวจสอบ)'} #{idx % 2 + 1}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">รหัสผ่าน: {acc.password}</span>
                    </div>

                    <p className="text-xs font-extrabold text-white truncate pt-1">{acc.fullName}</p>
                    <p className="text-[11px] text-slate-400 truncate">{acc.department}</p>
                    <p className="text-[11px] font-mono text-amber-400/90 truncate">{acc.email}</p>
                    <p className="text-[10px] text-slate-500 leading-tight pt-1">{acc.description}</p>
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickLogin(acc)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                      acc.role === 'Admin'
                        ? 'bg-red-600/90 hover:bg-red-500 text-white shadow-red-950/50'
                        : 'bg-sky-600/90 hover:bg-sky-500 text-white shadow-sky-950/50'
                    }`}
                  >
                    <LogIn size={13} />
                    <span>เข้าสู่ระบบด่วน ({acc.role})</span>
                  </button>
                </div>
              ))}
            </div>
          </div>



        </div>
      </div>
    </div>
  );
}
