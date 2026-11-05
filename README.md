# 일본 쇼핑 실속 계산기 (가칭)

일본 면세 환급액, 귀국 세금, 최종 실지출을 함께 계산하는 정적 사이트입니다. 요구 사항은 [SPEC.md](SPEC.md), 작업 계획은 [tasks/plan.md](tasks/plan.md)를 참고하세요.

## 명령어

```bash
npm run dev
npm run lint
npm test
npm run build
npm run test:e2e
```

처음 E2E를 실행할 때는 브라우저를 설치합니다.

```bash
npx playwright install chromium
```

## 출력

`npm run build`는 `out/`에 정적 파일을 만듭니다. E2E는 이 빌드 결과를 로컬 서버로 띄워 검사합니다.

`public/_redirects`는 호스팅 단계의 루트 이동 규칙입니다. 이 규칙이 적용되지 않는 환경에서는 루트 페이지의 meta refresh로 이동합니다.
