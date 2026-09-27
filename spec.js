/* 무무토리 레터 — 편지 규격·봉투·설문 문항. 고객 페이지와 프로젝트 허브가 함께 읽는다. */
window.LETTER_SPEC = {
  lineChars: 30,        // 타자기 한 줄 글자 수 (가정 — 실측 후 교체)
  maxLines: 24,         // 편지지 1장 최대 줄 수 (호칭·서명 포함, 가정)
  memoMax: 300,         // 대필: 꼭 넣고 싶은 문장/메모 최대 글자
  allowed: "한글, 영문, 숫자, 띄어쓰기, 줄바꿈, 기본 문장부호 . , ! ? ' \" ( ) - ~ : ; …",
  envelopes: [
    { id: "kraft",   name: "크라프트 · 실링왁스",  desc: "레트로 크라프트 봉투에 왁스 실링" },
    { id: "ivory",   name: "아이보리 · 도토리 도장", desc: "담백한 아이보리에 무무토리 도장" },
    { id: "airmail", name: "에어메일",            desc: "멀리서 건너온 편지 같은 줄무늬" },
    { id: "pattern", name: "무무토리 무늬",        desc: "무무토리 캐릭터 무늬 봉투" }
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

