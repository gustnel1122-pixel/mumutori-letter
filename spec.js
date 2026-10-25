/* 무무토리 레터 — 편지 규격·봉투·설문 문항. 고객 페이지와 프로젝트 허브가 함께 읽는다. */
/* 편지 규격 (2026-10-26 다시 잼 · 총괄 전달 사장님 지시 "예전 상세페이지의 실제 사진으로")
 * 근거 사진: 3월 첫 레터 상세 그림 2의 실제 편지 사진(봉투에 꽂힌 편지 — 종이 위·왼쪽·오른쪽 가장자리가 다 보임)
 *   https://cdn.sixshop.io/commerce/public/stores/mumutori/products/2_1772709894030.jpg
 *   재는 법: 사진을 4배로 키우고 종이 위 가장자리가 수평이 되게 11.6° 돌림 → 종이 폭 1744px = A5 가로 148mm로 놓음(0.0849mm/px).
 *   - 한 글자(한 칸, 띄어쓰기 포함): 긴 줄 7개(8~27칸)의 길이 ÷ 칸 수 → 평균 42.8px = 3.63mm
 *     (타자기 사진 10_1772709894101.jpg의 종이 누름대 눈금으로도 한 칸 ≈ 눈금 1.45칸 ≈ 3.68mm — 맞음)
 *   - 줄 간격: 첫 줄~17번째 줄 16칸 평균 102.6px = 8.71mm (사진 기울기 때문에 위쪽 9.2 · 아래쪽 8.3mm)
 *   - 여백: 왼쪽 글자 시작까지 146px = 12.4mm, 첫 줄 칸 위까지 약 10mm. 오른쪽 · 아래는 사진에서 안 보여 왼쪽과 같게 12mm(가정).
 *   - 사진 속 가장 긴 줄은 27칸(쓴 사람이 직접 줄을 바꿈 — 타자기 한계는 아님).
 *   - 종이 높이는 봉투에 가려 안 보임 → A5 210mm(레터 허브 '타자기 편지 A5, 반 접어 넣음').
 *   - 타자기 기종: 사진 속 몸체에 이름이 안 보임(확인 못 함). 탈네모꼴 활자의 한글 타자기.
 * 넉넉히 잡은 값: 한 칸 3.7mm(재 값 3.63) · 한 줄 9.0mm(재 값 8.71)
 * 계산: 한 줄 글자 수 = (148 − 12 − 12) ÷ 3.7 = 33.5 → 33
 *       장당 줄 수   = (210 − 10 − 12) ÷ 9.0 = 20.9 → 20 (내림, 호칭 · 빈 줄 · 서명 포함)
 * 실제 타자기로 10글자 · 10줄을 찍어 재면 paper.cellMm · lineMm만 바꾸고 위 계산을 다시 한다. */
window.LETTER_SPEC = {
  lineChars: 33,        // 한 줄 글자 수 = floor((148−24) ÷ 3.7)
  maxLines: 20,         // 편지지 1장 최대 줄 수 = floor((210−22) ÷ 9.0), 호칭·서명 포함
  paper: { w: 148, h: 210, top: 10, right: 12, bottom: 12, left: 12, cellMm: 3.7, lineMm: 9.0 },  // 미리보기도 이 값으로 그림
  memoMax: 300,         // 대필: 꼭 넣고 싶은 문장/메모 최대 글자
  // 한글 타자기(사장님 10/26): 영문은 못 찍음, ㅋㅋ 같은 낱자는 찍힘. 숫자 · 문장부호는 사진에 1 · . , 가 찍혀 있음(나머지는 확인 필요)
  allowed: "한글(ㅋㅋ 같은 낱자 포함), 숫자, 띄어쓰기, 줄바꿈, 기본 문장부호 . , ! ? ' \" ( ) - ~ : ; …",
  // 봉투: 지금 준비된 건 예전 상세페이지의 기본 봉투 한 가지뿐(10/25) → 고르는 칸은 막고 안내만. 준비되면 true.
  envReady: false,
  envNote: "지금은 무무토리 기본 봉투 한 가지에 담아 보내 드려요.",
  envelopes: [
    { id: "kraft",   name: "크라프트 · 실링왁스",  desc: "크라프트 봉투에 무무토리 도토리 실링", img: "mall/img/letter/mock_kraft_logo_seal.jpg" },
    { id: "ivory",   name: "아이보리 · 도토리 도장", desc: "아이보리 봉투에 무무토리 소인 도장", img: "mall/img/letter/mock_ivory_logo_stamp.jpg" },
    { id: "airmail", name: "에어메일",            desc: "줄무늬 봉투에 무무토리 우표와 소인", img: "mall/img/letter/mock_airmail_postage.jpg" },
    { id: "pattern", name: "무무토리 무늬",        desc: "무무토리 무늬 테이프와 봉인 스티커", img: "mall/img/letter/mock_pattern_tape.jpg" }
  ],
  relations: [
    { id: "lover",  label: "연인·배우자" },
    { id: "family", label: "가족" },
    { id: "friend", label: "친구" },
    { id: "thanks", label: "고마운 분" }
  ],
  survey: [
    { id: "call", q: "편지에서 이 사람을 어떻게 부르고 싶나요?", type: "text", req: true,
      ex: { lover: "예: 지수야 / 자기 / 여보", family: "예: 엄마 / 아빠 / 누나", friend: "예: 민정아 / 야 김민정", thanks: "예: 선생님 / 팀장님 / OO님" } },
    { id: "tone", q: "평소 이 사람에게 쓰는 말투는?", type: "radio", req: true,
      options: ["반말", "반존대", "존댓말"] },
    { id: "why", q: "이 편지를 쓰게 된 가장 큰 이유는?", type: "checks", req: true,
      options: ["기념일", "고마워서", "미안해서", "응원하고 싶어서", "그냥 문득", "기타"] },
    { id: "whyLine", q: "한 문장으로 말하면, \"이 편지는 ___해서 쓰는 편지다\"", type: "text", req: false },
    { id: "scene", q: "이 사람을 떠올리면 가장 먼저 생각나는 장면 하나를 적어주세요.", type: "textarea", req: true,
      help: "언제, 어디서, 어떤 모습이었는지. 아주 사소한 장면이 가장 좋아요. 적어주신 장면은 지우거나 바꾸지 않고 그대로 편지에 담아요." },
    { id: "heart", q: "평소에 잘 말하지 못했지만 꼭 전하고 싶은 마음은?", type: "checks", req: true,
      options: ["고마움", "미안함", "사랑", "존경", "걱정", "응원"] },
    { id: "recent", q: "최근 이 사람에게 있었던 일 중 편지에 담고 싶은 일이 있나요?", type: "textarea", req: false,
      help: "좋은 일이든 힘들었던 일이든 괜찮아요." },
    { id: "strength", q: "이 사람 덕분에 내가 조금 달라졌다고 느끼는 점은?", type: "textarea", req: false },
    { id: "future", q: "앞으로 이 사람과 함께하고 싶은 시간은?", type: "text", req: false },
    { id: "feel", q: "편지를 읽고 이 사람이 어떤 기분이면 좋겠어요?", type: "checks", req: true,
      options: ["웃었으면", "울컥했으면", "안심했으면", "힘이 났으면"] },
    { id: "last", q: "마지막으로 꼭 하고 싶은 한 마디", type: "text", req: true }
  ]
};

