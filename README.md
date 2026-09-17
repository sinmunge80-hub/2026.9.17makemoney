# 메이크머니 해빗챌린지 인증 웹앱

매일 저녁 단톡방에 사진으로 올리던 가계부 인증을, 폰으로 접속만 하면 되는
전용 웹페이지로 바꿔주는 앱입니다.

- ✅ **일일 가계부 인증**: 지출 금액 + 사진 + 한줄 소감
- 📊 **주간/월간 결산 인증**: 자동 합계 통계 + 결산 소감 인증
- 💵 **부수입 인증**: 금액 + 출처 기록, 이번 달 합계 자동 집계
- 🏠 **홈 대시보드**: 오늘 인증한 사람, 연속 인증일수 순위, 이번 달 참여왕
- 🔗 **정보허브**: 부수입 링크, 추천 유튜브 채널 등을 고정 링크 모음으로 정리

코딩 지식이 없어도 아래 순서대로 따라 하면 됩니다. (전체 약 15~20분)

---

## 1단계. 우선 그냥 열어보기 (로컬 체험 모드)

`index.html` 파일을 더블클릭해서 브라우저로 열면, 별도 설정 없이도 바로
써볼 수 있어요. 다만 이 상태에서는 **내 폰(브라우저)에만** 기록이 저장되고
다른 사람과 공유되지 않아요. (화면 상단에 "📱 로컬 체험 모드" 표시가 떠요)

챌린지원들과 실제로 함께 쓰려면 2~3단계를 진행해서
- 데이터가 실시간으로 공유되고
- 아무나 링크만 누르면 접속할 수 있게

배포까지 완료해야 합니다.

---

## 2단계. Firebase 연결하기 (무료, 코딩 없음, 약 10분)

여러 사람이 같은 데이터를 보려면 클라우드 저장소가 필요해요. 구글의
**Firebase**를 쓰면 무료로, 코드 한 줄 안 쓰고 설정할 수 있어요.

1. [Firebase 콘솔](https://console.firebase.google.com/) 접속 → 구글 계정으로 로그인
2. **프로젝트 추가** 클릭 → 프로젝트 이름 입력 (예: `makemoney-challenge`) → 계속 진행 (Google Analytics는 꺼도 됩니다)
3. 프로젝트가 만들어지면, 왼쪽 메뉴에서 **빌드 → Firestore Database** 클릭 → **데이터베이스 만들기**
   - 위치는 `asia-northeast3 (서울)` 선택
   - 보안 규칙은 우선 **테스트 모드로 시작** 선택 (아래 4단계에서 규칙을 다시 손봐요)
4. 왼쪽 메뉴에서 **빌드 → Storage** 클릭 → **시작하기** (사진 저장용, 테스트 모드로 시작)
5. 왼쪽 메뉴 상단 톱니바퀴(프로젝트 설정) → 아래로 스크롤 → **내 앱** 섹션에서
   `</>` (웹) 아이콘 클릭 → 앱 닉네임 입력 (예: `web`) → **앱 등록**
6. 화면에 나오는 `firebaseConfig` 값을 복사합니다. 아래처럼 생겼어요.

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "makemoney-challenge.firebaseapp.com",
     projectId: "makemoney-challenge",
     storageBucket: "makemoney-challenge.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef",
   };
   ```

7. 이 저장소의 `js/firebase-config.js` 파일을 열어서, 복사한 값으로 그대로
   교체하고 저장하세요.

이제 앱을 새로고침하면 상단 배지가 "☁️ 실시간 동기화"로 바뀌고, 다른
사람이 입력한 인증도 함께 보이게 됩니다.

---

## 3단계. 보안 규칙 설정하기 (중요! 꼭 하세요)

테스트 모드는 30일이 지나면 자동으로 데이터를 막아버려요. 그리고 아무나
데이터를 지울 수도 있어서, 아래 규칙으로 바꿔주는 걸 추천해요.

**Firestore 규칙** (Firestore Database → 규칙 탭에 붙여넣기)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /entries/{entryId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }
  }
}
```

**Storage 규칙** (Storage → 규칙 탭에 붙여넣기)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{allPaths=**} {
      allow read: if true;
      allow write: if request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

> 이 규칙은 "누구나 읽고 새로 인증을 올릴 수 있지만, 기존 기록은 지우거나
> 수정할 수 없게" 만들어줘요. 단톡방 링크로만 공유하는 소규모 챌린지에
> 적합한 간단한 설정입니다.

---

## 4단계. 배포해서 링크로 공유하기

Firebase에 연결까지 끝났다면, 이제 이 폴더를 무료 호스팅에 올려서
챌린지원들에게 링크 하나로 공유할 수 있어요. 가장 쉬운 방법은 **Vercel**입니다.

1. [vercel.com](https://vercel.com) 에서 GitHub 계정으로 가입/로그인
2. **Add New → Project** → 이 저장소(`2026.9.17makemoney`) 선택 → **Deploy** 클릭
   (프레임워크 설정 없이 그대로 두면 됩니다 — 정적 파일이라 빌드 과정이 필요 없어요)
3. 배포가 끝나면 `https://your-project.vercel.app` 같은 주소가 생겨요.
   이 주소를 단톡방에 공유하면 끝!
4. 이후 이 저장소에 새로운 커밋이 올라올 때마다 자동으로 재배포돼요.

(GitHub Pages를 선호하신다면 저장소 **Settings → Pages**에서 브랜치를
`main`, 폴더를 `/ (root)`로 지정해도 동일하게 동작합니다.)

---

## 5단계. 정보허브 링크 채워넣기

`js/links-data.js` 파일을 열면 부수입 링크, 추천 유튜브 채널 등을
카테고리별로 정리할 수 있어요. `title`, `desc`, `url` 값만 원하는 내용으로
바꿔서 저장하면 바로 반영됩니다. (`url: "#"`으로 되어 있는 항목은 실제
링크 주소로 꼭 바꿔주세요)

---

## 폴더 구조

```
index.html          홈 대시보드 (오늘 인증 현황, 순위)
daily.html           일일 가계부 인증
settlement.html       주간/월간 결산 (탭으로 전환)
income.html           부수입 인증
links.html            정보허브 (고정 링크 모음)
css/style.css          디자인
js/firebase-config.js  Firebase 연결 설정 (본인 값으로 교체)
js/db.js                데이터 저장/조회 (Firebase ↔ 로컬 자동 전환)
js/app.js                공통 유틸 (닉네임, 날짜, 하단 네비게이션)
js/links-data.js        정보허브에 보여줄 링크 목록
```

## 참고

- 사진은 자동으로 축소·압축되어 저장되니 용량 걱정은 안 하셔도 돼요.
- 로컬 체험 모드에서는 사진이 브라우저 저장공간에 base64로 저장되어
  너무 많이 쌓이면 느려질 수 있어요 — 실제 운영은 꼭 Firebase 연결을 권장해요.
- 닉네임은 브라우저에 저장돼서 다음 방문 때 자동으로 채워집니다.
