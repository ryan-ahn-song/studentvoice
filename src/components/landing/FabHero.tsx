import { useNavigate } from 'react-router'
import { COLORS } from '../../tokens/tokens'
import { useHomeStats } from '../../hooks/useProposals'
import ProductMock from './ProductMock'

export default function FabHero() {
  const navigate = useNavigate()
  const { stats, loading } = useHomeStats()
  const currentMonth = new Date().getMonth() + 1
  const socialProofText = loading
    ? '집계 불러오는 중'
    : `${stats.profiles.toLocaleString('ko-KR')}명의 학생이 참여 중 · ${currentMonth}월 ${stats.doneThisMonth.toLocaleString('ko-KR')}건 반영됨`

  return (
    <section className="pt-24 sm:pt-25 pb-12 sm:pb-20 px-4 bg-white text-center overflow-hidden">
      {/* Social proof pill */}
      <div
        className="inline-flex max-w-full items-center gap-2 px-3.5 py-1.5 rounded-full mb-7"
        style={{
          border: `1px solid ${COLORS.line}`,
          background: COLORS.surfaceRaised
        }}
      >
        <img
          src="/assets/daeshin-cursive.png"
          alt="daeshin"
          className="hidden sm:block h-8 w-24 object-contain flex-shrink-0"
        />
        <span className="text-xs sm:text-sm text-ink-sub font-medium whitespace-normal">{socialProofText}</span>
      </div>

      {/* Hero heading */}
      <h1 className="text-[44px] sm:text-[64px] lg:text-display font-bold leading-[1.08] text-ink mx-auto max-w-prose break-keep">
        학교를 바꾸는<br/>가장 작은 한 표.
      </h1>

      {/* Description */}
      <p className="text-base sm:text-xl text-ink-sub leading-relaxed mt-5.5 max-w-prose mx-auto break-keep">
        학생이 직접 제안하고, 30표가 모이면 학생회를 통해 학교에 정식 전달됩니다.<br className="hidden sm:block"/> 작은 의견이 학교의 내일이 되도록.
      </p>

      {/* CTA buttons */}
      <div className="mt-9 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-center mx-auto w-full max-w-sm sm:max-w-none">
        <button
          onClick={() => navigate('/login')}
          className="px-5.5 py-3.25 rounded-2.5 bg-ink text-white text-base sm:text-lg font-bold cursor-pointer inline-flex items-center justify-center gap-2 tracking-tight hover:opacity-90"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.14)' }}
        >
          학교 이메일로 시작하기
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={() => navigate('/home')}
          className="px-5 py-3.25 rounded-2.5 bg-white text-ink text-base sm:text-lg font-bold cursor-pointer tracking-tight hover:opacity-90"
          style={{ border: `1px solid ${COLORS.line}` }}
        >
          진행 중인 안건 보기
        </button>
      </div>

      {/* Product mock */}
      <div className="max-w-prose mx-auto mt-10 sm:mt-14 px-0 sm:px-10">
        <ProductMock />
      </div>
    </section>
  )
}
