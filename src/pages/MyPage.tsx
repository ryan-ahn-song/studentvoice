import { useState } from 'react'
import { useNavigate } from 'react-router'
import AppLayout from '../components/shared/AppLayout'
import Badge from '../components/shared/Badge'
import ProgressBar from '../components/shared/ProgressBar'
import Btn from '../components/shared/Btn'
import { useAuth } from '../contexts/AuthContext'
import { useMyProposals, useNotificationSettings } from '../hooks/useProposals'
import { normalizeText, validatePassword } from '../lib/security'
import { getProposalStatusLabel, getProposalStatusTone } from '../lib/proposalStatus'
import { supabase } from '../lib/supabase'
import { COLORS } from '../tokens/tokens'
import type { BadgeTone } from '../tokens/tokens'
import type { AccountRole, Proposal, ProposalStatus } from '../types/database'

// 학생회로 전달되어 살아 있는 안건. SELECTED_PROPOSAL_STATUSES 와 달리
// 'rejected' 를 포함하지 않는다 — 반려는 선정된 안건이 아니다.
const SELECTED_MY_PAGE_STATUSES: ProposalStatus[] = ['selected', 'discussing', 'done']

const ACCOUNT_ROLE_LABELS: Record<AccountRole, string> = {
  student: '학생',
  admin: '관리자',
  teacher: '교사',
  parent: '학부모',
}

// ── Helpers ──
function proposalStatus(p: Proposal): [string, BadgeTone] {
  if (p.vote_count >= 20 && p.status === 'active') return ['인기 이슈', 'fire']
  return [getProposalStatusLabel(p.status), getProposalStatusTone(p.status)]
}

function initials(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.length >= 2) return name.slice(0, 2)
  if (email) return email.slice(0, 2).toUpperCase()
  return '?'
}

// ── Sub-components ──
function TagPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
        background: COLORS.surfaceAlt, color: COLORS.inkSub, border: `1px solid ${COLORS.line}`,
      }}
    >
      {children}
    </span>
  )
}

function Stat({ n, l, tone }: { n: string; l: string; tone?: 'brand' }) {
  return (
    <div>
      <div
        style={{
          fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1,
          color: tone === 'brand' ? COLORS.brand : COLORS.ink,
          fontFeatureSettings: '"tnum"',
        }}
      >
        {n}
      </div>
      <div style={{ fontSize: 11, color: COLORS.inkSub, marginTop: 6 }}>{l}</div>
    </div>
  )
}

// ── Page ──
export default function MyPage() {
  const navigate = useNavigate()
  const { user, profile, signOut, refreshProfile } = useAuth()
  const { data: myProposals, loading } = useMyProposals(user?.id)
  const { settings: notifSettings, saving: notifSaving, error: notifError, updateSetting } = useNotificationSettings(user?.id)
  const accountRole = profile?.account_role ?? (profile?.is_admin ? 'admin' : 'student')

  // Profile edit state
  const [profileEditing, setProfileEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editGrade, setEditGrade] = useState<number | ''>('')
  const [editClass, setEditClass] = useState<number | ''>('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileStatus, setProfileStatus] = useState<string | null>(null)

  const handleStartEdit = () => {
    setEditName(profile?.name ?? '')
    setEditGrade(profile?.grade ?? '')
    setEditClass(profile?.class ?? '')
    setProfileStatus(null)
    setProfileEditing(true)
  }

  const handleCancelEdit = () => {
    setProfileEditing(false)
    setProfileStatus(null)
  }

  const handleSaveProfile = async () => {
    if (!user) return
    // SECURITY FIX P2 (2025-05-28): editName.trim() → normalizeText() 로 제어문자 제거
    const sanitizedName = normalizeText(editName, 40)
    if (!sanitizedName) { setProfileStatus('이름을 입력해주세요.'); return }
    const classVal = Number(editClass)
    if (editClass !== '' && (classVal < 1 || classVal > 20)) {
      setProfileStatus('반은 1~20 사이로 입력해주세요.'); return
    }
    setProfileSaving(true)
    setProfileStatus(null)
    try {
      const { error } = await supabase.from('profiles').update({
        name: sanitizedName,
        ...(editGrade !== '' ? { grade: Number(editGrade) } : {}),
        ...(editClass !== '' ? { class: classVal } : {}),
      }).eq('id', user.id)
      if (error) {
        setProfileStatus('저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      } else {
        await refreshProfile()
        setProfileEditing(false)
        setProfileStatus('✓ 프로필이 업데이트되었습니다.')
      }
    } finally {
      setProfileSaving(false)
    }
  }

  // Password change state
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confPw, setConfPw] = useState('')
  const [pwStatus, setPwStatus] = useState<string | null>(null)
  const [pwLoading, setPwLoading] = useState(false)
  // SECURITY FIX P3 (2025-05-28): 비밀번호 변경 연속 시도 횟수 제한 (클라이언트)
  const [pwFailCount, setPwFailCount] = useState(0)
  const PW_MAX_ATTEMPTS = 5

  // Stats
  const totalProposals = myProposals.length
  // 반려는 선정이 아니므로 제외한다.
  const selectedCount = myProposals.filter(p => SELECTED_MY_PAGE_STATUSES.includes(p.status)).length

  // Change password
  const handleChangePw = async () => {
    // SECURITY FIX P3: 클라이언트 재시도 횟수 초과 차단
    if (pwFailCount >= PW_MAX_ATTEMPTS) {
      setPwStatus('시도 횟수를 초과했습니다. 페이지를 새로고침 후 다시 시도해주세요.')
      return
    }
    // SECURITY FIX P2: 인라인 길이 체크 → security.ts의 validatePassword 통일 사용
    const pwError = validatePassword(newPw)
    if (pwError) { setPwStatus(pwError); return }
    if (newPw !== confPw) {
      setPwStatus('새 비밀번호와 확인이 일치하지 않습니다.')
      return
    }
    setPwLoading(true)
    setPwStatus(null)
    // Re-sign in to verify current password
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user!.email!, password: curPw,
    })
    if (authErr) {
      setPwFailCount(c => c + 1)
      setPwStatus(`현재 비밀번호가 올바르지 않습니다. (${pwFailCount + 1}/${PW_MAX_ATTEMPTS})`)
      setPwLoading(false)
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) {
      setPwStatus(error.message)
    } else {
      setPwStatus('✓ 비밀번호가 변경되었습니다.')
      setPwFailCount(0)
      setCurPw(''); setNewPw(''); setConfPw('')
    }
    setPwLoading(false)
  }

  // Handle sign out
  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const displayName = profile?.name ?? profile?.email?.split('@')[0] ?? '학생'
  const displayEmail = profile?.email ?? user?.email ?? ''
  const gradeClass = (profile?.grade && profile?.class)
    ? `${profile.grade}학년 ${profile.class}반`
    : null

  return (
    <AppLayout active="home" isAdmin={profile?.is_admin}>
      {/* Profile section */}
      <section className="responsive-section" style={{ padding: '56px 48px 24px', background: COLORS.bg }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div
            className="profile-card"
            style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
              color: COLORS.brand, marginBottom: 14,
            }}
          >
            MY PAGE
          </div>

          {/* Profile card */}
          <div
            style={{
              background: COLORS.surface, border: `1px solid ${COLORS.line}`,
              borderRadius: 20, padding: 32,
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
              {/* Avatar */}
              <div
                style={{
                  width: 72, height: 72, borderRadius: 99, background: COLORS.brand,
                  color: '#fff', display: 'grid', placeItems: 'center',
                  fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', flexShrink: 0,
                }}
              >
                {initials(profile?.name, profile?.email)}
              </div>

              {profileEditing ? (
                /* ── Edit form ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {/* Name */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.inkSub, marginBottom: 4 }}>이름</div>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="이름"
                      maxLength={40}
                      style={{
                        width: '100%', maxWidth: 220, height: 36, border: `1px solid ${COLORS.line}`,
                        borderRadius: 8, padding: '0 12px', fontSize: 14, color: COLORS.ink,
                        fontFamily: 'inherit', outline: 'none', background: COLORS.surface,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  {/* Grade + Class */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.inkSub, marginBottom: 4 }}>학년</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[1, 2, 3].map(g => (
                          <button
                            key={g}
                            onClick={() => setEditGrade(editGrade === g ? '' : g)}
                            style={{
                              width: 36, height: 36, borderRadius: 8, fontSize: 13, fontWeight: 600,
                              border: `1px solid ${editGrade === g ? COLORS.brand : COLORS.line}`,
                              background: editGrade === g ? COLORS.brand : COLORS.surface,
                              color: editGrade === g ? '#fff' : COLORS.ink,
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.inkSub, marginBottom: 4 }}>반</div>
                      <input
                        type="number"
                        value={editClass}
                        onChange={e => setEditClass(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="반"
                        min={1} max={20}
                        style={{
                          width: 64, height: 36, border: `1px solid ${COLORS.line}`,
                          borderRadius: 8, padding: '0 10px', fontSize: 14, color: COLORS.ink,
                          fontFamily: 'inherit', outline: 'none', background: COLORS.surface,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                  {/* Status */}
                  {profileStatus && (
                    <div style={{ fontSize: 12, color: profileStatus.startsWith('✓') ? COLORS.brand : COLORS.warn }}>
                      {profileStatus}
                    </div>
                  )}
                  {/* Save / Cancel */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    <Btn variant="primary" size="sm" onClick={handleSaveProfile} disabled={profileSaving}>
                      {profileSaving ? '저장 중…' : '저장'}
                    </Btn>
                    <Btn variant="outline" size="sm" onClick={handleCancelEdit} disabled={profileSaving}>
                      취소
                    </Btn>
                  </div>
                </div>
              ) : (
                /* ── Display mode ── */
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
                      {displayName}
                    </span>
                    {gradeClass && <Badge>{gradeClass}</Badge>}
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.inkSub }}>{displayEmail}</div>
                  <div style={{ fontSize: 11, color: COLORS.inkMuted, marginTop: 4 }}>
                    {ACCOUNT_ROLE_LABELS[accountRole]} 계정 · {accountRole === 'admin' ? '운영 권한 보유' : '일반 이용 권한'}
                  </div>
                  {profileStatus && (
                    <div style={{ fontSize: 12, color: COLORS.brand, marginTop: 6 }}>{profileStatus}</div>
                  )}
                </div>
              )}
            </div>

            {/* Stats + Sign out */}
            <div style={{ display: 'flex', gap: 32, paddingLeft: 32, borderLeft: `1px solid ${COLORS.lineSoft}`, alignItems: 'flex-start' }}>
              <Stat n={String(totalProposals)} l="작성한 안건" />
              <Stat n={String(selectedCount)} l="선정된 안건" tone="brand" />
              <div style={{ marginLeft: 8, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
                {!profileEditing && (
                  <Btn variant="outline" size="sm" onClick={handleStartEdit}>정보 수정</Btn>
                )}
                <Btn variant="outline" size="sm" onClick={handleSignOut}>로그아웃</Btn>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="responsive-section" style={{ padding: '24px 48px 80px', background: COLORS.bg }}>
        <div
          className="responsive-grid"
          style={{
            maxWidth: 1080, margin: '0 auto',
            display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20,
          }}
        >
          {/* My proposals */}
          <div
            style={{
              background: COLORS.surface, border: `1px solid ${COLORS.line}`,
              borderRadius: 16, overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '20px 24px', borderBottom: `1px solid ${COLORS.lineSoft}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                내가 작성한 안건
                <span style={{ marginLeft: 8, fontSize: 13, color: COLORS.inkMuted, fontWeight: 500 }}>
                  · {loading ? '…' : `${totalProposals}건`}
                </span>
              </h3>
              <span style={{ fontSize: 12, color: COLORS.inkSub }}>최신순 ↓</span>
            </div>

            {loading ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: COLORS.inkMuted, fontSize: 13 }}>
                불러오는 중…
              </div>
            ) : myProposals.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>✏️</div>
                <div style={{ fontSize: 13, color: COLORS.inkSub, marginBottom: 16 }}>
                  아직 작성한 안건이 없습니다
                </div>
                <Btn variant="primary" size="sm" onClick={() => navigate('/write')}>
                  첫 번째 안건 작성하기
                </Btn>
              </div>
            ) : (
              myProposals.map((m, i) => {
                const [stateLabel, tone] = proposalStatus(m)
                const isActive = m.status === 'active'
                const isBlinded = m.status === 'blinded'
                const isRejected = m.status === 'rejected'
                return (
                  <div
                    key={m.id}
                    onClick={() => navigate(`/proposals/${m.id}`)}
                    style={{
                      padding: '18px 24px',
                      borderTop: i ? `1px solid ${COLORS.lineSoft}` : 'none',
                      display: 'grid', gridTemplateColumns: '1fr auto', gap: 16,
                      alignItems: 'center', cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <TagPill>{m.category}</TagPill>
                        <Badge tone={tone}>{stateLabel}</Badge>
                      </div>
                      <div
                        style={{
                          fontSize: 14, fontWeight: 600, color: COLORS.ink,
                          letterSpacing: '-0.015em', marginBottom: 8,
                        }}
                      >
                        {m.title}
                      </div>
                      {isActive ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, maxWidth: 200 }}>
                            <ProgressBar value={m.vote_count} max={30} height={5} />
                          </div>
                          <span style={{ fontSize: 11, color: COLORS.inkMuted, fontFeatureSettings: '"tnum"' }}>
                            {m.vote_count}/30표
                          </span>
                        </div>
                      ) : isBlinded ? (
                        <span style={{ fontSize: 11, color: COLORS.inkMuted, fontWeight: 600 }}>
                          운영진 검토로 비공개 처리됨 · 나에게만 보입니다
                        </span>
                      ) : isRejected ? (
                        <span style={{ fontSize: 11, color: COLORS.warn, fontWeight: 600 }}>
                          반려됨 · {m.vote_count}표
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: COLORS.brand, fontWeight: 600 }}>
                          ✓ 선정 · {m.vote_count}표
                        </span>
                      )}
                    </div>
                    <span style={{ color: COLORS.inkMuted, fontSize: 16 }}>→</span>
                  </div>
                )
              })
            )}
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Password change */}
            <div
              style={{
                background: COLORS.surface, border: `1px solid ${COLORS.line}`,
                borderRadius: 16, padding: 24,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                비밀번호 변경
              </h3>
              <p style={{ fontSize: 12, color: COLORS.inkSub, margin: '6px 0 18px', lineHeight: 1.55 }}>
                현재 비밀번호를 입력한 후 새 비밀번호로 변경할 수 있습니다.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: '현재 비밀번호', value: curPw, onChange: setCurPw, placeholder: '현재 비밀번호' },
                  { label: '새 비밀번호', value: newPw, onChange: setNewPw, placeholder: '영문+숫자 8자 이상' },
                  { label: '새 비밀번호 확인', value: confPw, onChange: setConfPw, placeholder: '다시 한 번 입력' },
                ].map(({ label, value, onChange, placeholder }) => (
                  <div key={label}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink, marginBottom: 8 }}>{label}</div>
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', border: `1px solid ${COLORS.line}`,
                        borderRadius: 10, background: COLORS.surface, padding: '0 14px', height: 48,
                      }}
                    >
                      <input
                        type="password"
                        placeholder={placeholder}
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        style={{
                          flex: 1, border: 'none', outline: 'none', fontSize: 14,
                          color: COLORS.ink, fontFamily: 'inherit', background: 'transparent',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {pwStatus && (
                <div
                  style={{
                    marginTop: 10, fontSize: 12,
                    color: pwStatus.startsWith('✓') ? COLORS.brand : COLORS.warn,
                  }}
                >
                  {pwStatus}
                </div>
              )}
              <Btn
                variant="primary" size="md" full
                style={{ marginTop: 18 }}
                onClick={handleChangePw}
                disabled={pwLoading}
              >
                {pwLoading ? '변경 중…' : '변경하기'}
              </Btn>
            </div>

            {/* Notifications */}
            <div
              style={{
                background: COLORS.surface, border: `1px solid ${COLORS.line}`,
                borderRadius: 16, padding: 24,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', marginBottom: 14 }}>
                알림 설정
              </h3>
              {notifError && <div role="alert" style={{ fontSize: 12, color: COLORS.warn, marginBottom: 10 }}>{notifError}</div>}
              {(
                [
                  { key: 'on_selected', label: '내 안건이 선정되었을 때' },
                  { key: 'on_reply',    label: '내 안건에 학생회 답변이 달렸을 때' },
                  { key: 'on_voted',    label: '추천한 안건의 상태가 변경되었을 때' },
                ] as const
              ).map(({ key, label }) => {
                const on = notifSettings[key]
                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 0', borderTop: `1px solid ${COLORS.lineSoft}`,
                    }}
                  >
                    <span style={{ fontSize: 13, color: COLORS.ink }}>{label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={label}
                      onClick={() => updateSetting(key, !on)}
                      disabled={notifSaving}
                      style={{
                        width: 34, height: 20, borderRadius: 99,
                        background: on ? COLORS.brand : COLORS.line,
                        position: 'relative', cursor: notifSaving ? 'wait' : 'pointer',
                        transition: 'background .2s', flexShrink: 0,
                        border: 0, padding: 0,
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute', top: 2,
                          left: on ? 16 : 2,
                          width: 16, height: 16, borderRadius: 99,
                          background: '#fff', transition: 'left .2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        }}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  )
}
