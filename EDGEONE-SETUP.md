# KSAM EdgeOne 관리자 설정

EdgeOne Makers 프로젝트의 `Settings > Environment Variables`에서 다음 값을 추가합니다.

| 이름 | 값 |
| --- | --- |
| `ADMIN_USERNAME` | 관리자 아이디 |
| `ADMIN_PASSWORD` | 관리자 비밀번호 |
| `SESSION_SECRET` | 32자 이상의 무작위 문자열 |

세 값은 Production 환경에 적용하고 새 배포를 실행합니다.

- 관리자: `/admin/`
- 공지 API: `/api/notices`
- 공지 저장소: EdgeOne Blob `ksam-content`
- 이미지 저장소: EdgeOne Blob `ksam-media`

Netlify, Netlify Identity, Git Gateway는 사용하지 않습니다.
