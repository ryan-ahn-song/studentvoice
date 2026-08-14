import MicMark from './MicMark'

export default function Footer() {
  return (
    <footer className="bg-footer-bg text-white py-10 px-5 sm:px-15">
      <div className="flex flex-col md:flex-row md:flex-wrap xl:flex-nowrap items-start gap-8 xl:gap-20">
        <div className="flex items-center gap-2.5 min-w-42 flex-shrink-0">
          <MicMark size={28} color="#fff" />
          <div className="leading-snug">
            <div className="text-base font-bold">학생의 목소리</div>
            <div className="text-base font-normal">대전대신고등학교</div>
          </div>
        </div>

        <div className="flex-shrink-0">
          <div className="text-sm font-bold tracking-widest mb-2.5">CONTACT</div>
          <div className="text-sm font-normal leading-7">
            Jang Junseok<br />
            24_10325@dshs.kr
          </div>
        </div>

        <div className="flex-shrink-0">
          <div className="text-sm font-bold tracking-widest mb-2.5">LOCATION</div>
          <div className="text-sm font-normal leading-7">
            대전광역시 서구 오량1길 98<br />
            Daejeon Korea&nbsp;&nbsp;Seo-gu, Oryang 1-gil, 98
          </div>
        </div>

        <div className="flex-shrink-0 max-w-72">
          <div className="text-sm font-bold tracking-widest mb-2.5">PRIVACY POLICY</div>
          <div className="text-xs leading-6 text-white/75">
            학생의 목소리는 학교 이메일 인증, 안건 작성, 투표 및 알림 제공에 필요한 최소한의 정보만 수집하며,
            수집된 정보는 서비스 운영과 학교 의견 전달 목적 외에는 사용하지 않습니다.
          </div>
        </div>

        <div className="md:ml-auto flex flex-col items-start md:items-end justify-end self-stretch text-sm flex-shrink-0 gap-0.5 whitespace-nowrap">
          <span>site made by <a href="https://github.com/ryan-ahn-song" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: 'inherit' }}>Ryan Ahn Song</a></span>
          <span>© 2026 <strong className="font-bold">ACT.</strong> All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
