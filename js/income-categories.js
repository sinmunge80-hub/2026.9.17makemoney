// 부수입 카테고리 목록입니다. id는 저장된 데이터와 연결되니 함부로 지우지 말고,
// label(화면에 보이는 이름)만 자유롭게 수정하세요. 새 카테고리를 추가하려면
// css/style.css의 --cat-xxx 색상 변수도 함께 추가해야 색이 입혀집니다.
export const INCOME_CATEGORIES = [
  { id: "bank-event", label: "증권사/은행 이벤트" },
  { id: "apptech", label: "앱테크" },
  { id: "cashback", label: "캐시백(카드/지역화폐)" },
  { id: "dividend", label: "배당금·주식수익" },
  { id: "ipo", label: "공모주" },
  { id: "business", label: "부업/사업" },
  { id: "secondhand", label: "중고거래" },
  { id: "fx", label: "환테크" },
  { id: "etc", label: "기타" },
];

export function categoryLabel(id) {
  const found = INCOME_CATEGORIES.find((c) => c.id === id);
  return found ? found.label : "기타";
}
