# Lonnie Blog App - 프로젝트 개요

## 프로젝트 소개

마크다운 기반 개인 블로그/문서 관리 애플리케이션. 문서 작성, AI 기반 메타데이터 자동 생성, 지식 그래프 시각화, AI 채팅 기능을 제공한다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, React Router 7 |
| Backend | Hono (Vercel Serverless Functions) |
| Database | PostgreSQL (Neon Serverless) |
| ORM | Drizzle ORM |
| AI | Groq API (LLM) |
| Storage | AWS S3 (미디어 업로드) |
| Build | Vite 7 |
| Deploy | Vercel |

---

## 프로젝트 구조

```
lonnie-blog-app/
├── api/                         # Backend (Hono serverless API)
│   ├── [[...route]].ts          # Vercel catch-all route handler
│   └── _server/
│       ├── app.ts               # Hono app 초기화, 라우트 등록
│       ├── dev.ts               # 로컬 개발 서버
│       ├── db/
│       │   ├── index.ts         # DB 연결 (Neon serverless)
│       │   └── schema.ts        # Drizzle 스키마 정의
│       ├── routes/
│       │   ├── documents.ts     # 문서 CRUD API
│       │   ├── ontology.ts      # 온톨로지/지식그래프 API
│       │   ├── media.ts         # 미디어 업로드 API
│       │   └── chat.ts          # AI 채팅 API
│       └── lib/
│           ├── ai.ts            # AI 메타데이터 생성 로직
│           ├── groq.ts          # Groq API 클라이언트
│           ├── ontology.ts      # 온톨로지 생성/관리
│           ├── chat.ts          # AI 채팅 로직
│           ├── s3.ts            # S3 presigned URL 생성
│           └── categories.ts    # 카테고리 관리
├── src/                         # Frontend (React SPA)
│   ├── app/
│   │   ├── main.tsx             # 엔트리포인트
│   │   ├── App.tsx              # 루트 레이아웃 (사이드바 + Outlet)
│   │   ├── router.tsx           # React Router 설정
│   │   └── index.css            # 글로벌 스타일
│   ├── components/
│   │   ├── Sidebar.tsx          # 사이드바 네비게이션
│   │   ├── DocumentList.tsx     # 문서 목록 페이지
│   │   ├── DocumentView.tsx     # 문서 상세 보기
│   │   ├── DocumentEditor.tsx   # 문서 작성/편집기
│   │   ├── MarkdownRenderer.tsx # 마크다운 렌더링
│   │   ├── KnowledgeGraph.tsx   # 지식 그래프 페이지
│   │   ├── GraphCanvas.tsx      # D3 force 기반 그래프 캔버스
│   │   ├── AskAI.tsx            # AI 채팅 페이지
│   │   ├── InfoPanel.tsx        # 문서 정보 패널
│   │   ├── FileUpload.tsx       # 파일 업로드 컴포넌트
│   │   ├── MediaLightbox.tsx    # 미디어 라이트박스
│   │   ├── ConfirmDialog.tsx    # 확인 다이얼로그
│   │   ├── OfflineDialog.tsx    # 오프라인 감지 다이얼로그
│   │   ├── ServerError.tsx      # 서버 에러 페이지
│   │   └── Toast.tsx            # 토스트 알림
│   ├── hooks/
│   │   ├── useDocuments.ts      # 문서 데이터 훅
│   │   ├── useOntology.ts       # 온톨로지 데이터 훅
│   │   ├── useChat.ts           # 채팅 상태 관리 훅
│   │   ├── useRegenerate.ts     # AI 재생성 훅
│   │   └── useToast.ts          # 토스트 알림 훅
│   ├── lib/
│   │   ├── api.ts               # API 클라이언트 (fetch 래퍼)
│   │   └── toc.ts               # 목차 파싱 유틸
│   └── types/
│       └── index.ts             # 공유 타입 정의
├── drizzle.config.ts            # Drizzle Kit 설정
├── vite.config.ts               # Vite 설정
├── vercel.json                  # Vercel 배포 설정
├── package.json
└── tsconfig.json
```

---

## 커밋 히스토리

| 커밋 | 내용 |
|------|------|
| `59978f2` | Initial commit: MD Viewer 앱 초기 구축 |
| `e1b7f77` | DB 드라이버를 `@vercel/postgres`에서 `@neondatabase/serverless`로 전환 |
| `fd39468` | 사이드바 네비게이션 레이아웃 추가, 앱 이름을 "Lonnie Blog"로 변경 |
| `f33e815` | 문서 카테고리, 지식 그래프, AI 채팅, 미디어 업로드, 코드 정리 |

---

## 주요 기능 상세

### 1. 문서 관리 (CRUD)

- **목록 조회**: 최신 수정순 정렬, 카테고리 필터링
- **상세 보기**: 마크다운 렌더링 (GFM, 코드 하이라이팅, slug 기반 앵커)
- **작성/편집**: 마크다운 에디터, 카테고리 지정
- **삭제**: 확인 다이얼로그 포함

**API 엔드포인트:**
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/documents` | 문서 목록 |
| GET | `/api/documents/categories` | 카테고리 목록 |
| GET | `/api/documents/:id` | 문서 상세 (topics 포함) |
| POST | `/api/documents` | 문서 생성 |
| PUT | `/api/documents/:id` | 문서 수정 |
| DELETE | `/api/documents/:id` | 문서 삭제 |
| POST | `/api/documents/:id/generate` | AI 메타데이터 재생성 |
| POST | `/api/documents/generate-categories` | 카테고리 일괄 생성 |

### 2. AI 메타데이터 자동 생성

문서 생성/수정 시 Groq API를 통해 자동으로 생성:
- **category**: 문서 주제를 나타내는 1-3단어 라벨 (기존 카테고리 재활용 우선)
- **summary**: 2-3문장 요약
- **keywords**: 3-7개 키워드 태그
- **toc**: 3-8개 주요 섹션/토픽 목차

content 변경 시 기존 메타데이터 초기화 후 재생성한다.

### 3. 지식 그래프 (Knowledge Graph)

문서 간 관계를 시각화하는 D3 force-directed 그래프.

- **Topics**: 문서에 할당된 주제 (색상, 관련도 포함)
- **Relationships**: 문서 간 관계 (유형, 설명, 강도)
- **Ontology 생성**: AI가 전체 문서를 분석하여 토픽과 관계를 자동 생성
- **상태 관리**: `idle` → `generating` → `idle` / `stale` / `error`

**API 엔드포인트:**
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/ontology/graph` | 그래프 데이터 (nodes, edges, topics, meta) |
| POST | `/api/ontology/generate` | 온톨로지 재생성 |
| GET | `/api/ontology/status` | 생성 상태 조회 |

### 4. AI 채팅 (Ask AI)

저장된 문서를 컨텍스트로 활용하는 AI 질의응답 기능.
- 대화 히스토리 유지
- 답변에 참고 문서 출처(sources) 포함

**API 엔드포인트:**
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/chat` | 질문 전송 및 답변 수신 |

### 5. 미디어 업로드

S3 presigned URL을 통한 이미지/비디오 직접 업로드.
- 클라이언트에서 presigned URL 획득 후 S3에 직접 PUT
- `image/*`, `video/*` 타입만 허용

**API 엔드포인트:**
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/media/upload-url` | presigned URL 발급 |

### 6. UI/UX

- **사이드바 레이아웃**: 네비게이션 (문서 목록, 지식 그래프, AI 채팅)
- **오프라인 감지**: 네트워크 끊김 시 다이얼로그 표시
- **서버 에러 처리**: 500 에러 시 에러 페이지로 리다이렉트
- **토스트 알림**: 작업 결과 피드백
- **미디어 라이트박스**: 이미지/비디오 확대 보기
- **확인 다이얼로그**: 삭제 등 위험 작업 전 확인

---

## 데이터베이스 스키마

### documents
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial (PK) | |
| title | text (NOT NULL) | 문서 제목 |
| content | text (NOT NULL) | 마크다운 본문 |
| category | text | AI 생성 카테고리 |
| summary | text | AI 생성 요약 |
| keywords | jsonb (string[]) | AI 생성 키워드 |
| toc | jsonb (string[]) | AI 생성 목차 |
| created_at | timestamp | 생성일 |
| updated_at | timestamp | 수정일 |

### topics
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial (PK) | |
| name | text (UNIQUE, NOT NULL) | 토픽명 |
| description | text | 설명 |
| color | text (NOT NULL) | 표시 색상 |

### document_topics
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial (PK) | |
| document_id | integer (FK → documents) | |
| topic_id | integer (FK → topics) | |
| relevance | real (default 1) | 관련도 |

### document_relationships
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial (PK) | |
| source_document_id | integer (FK → documents) | |
| target_document_id | integer (FK → documents) | |
| relationship_type | text (NOT NULL) | 관계 유형 |
| description | text | 관계 설명 |
| strength | real (default 0.5) | 관계 강도 |

### ontology_meta
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial (PK) | |
| last_generated_at | timestamp | 마지막 생성 시각 |
| document_count | integer | 생성 당시 문서 수 |
| status | text | idle / generating / error / stale |

---

## 프론트엔드 라우팅

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/` | DocumentList | 문서 목록 |
| `/doc/:id` | DocumentView | 문서 상세 보기 |
| `/doc/:id/edit` | DocumentEditor | 문서 편집 |
| `/new` | DocumentEditor | 새 문서 작성 |
| `/graph` | KnowledgeGraph | 지식 그래프 |
| `/ask` | AskAI | AI 채팅 |
| `/error` | ServerError | 서버 에러 페이지 |

---

## 개발 환경 설정

### 필수 환경 변수 (.env.local)
```
POSTGRES_URL=          # Neon PostgreSQL 연결 문자열
GROQ_API_KEY=          # Groq API 키
AWS_ACCESS_KEY_ID=     # AWS S3 액세스 키
AWS_SECRET_ACCESS_KEY= # AWS S3 시크릿 키
AWS_REGION=            # S3 리전
S3_BUCKET=             # S3 버킷명
```

### 실행 방법
```bash
# 의존성 설치
npm install

# DB 마이그레이션
npm run db:push

# 개발 서버 (프론트엔드: Vite, 백엔드: tsx watch)
npm run dev        # 프론트엔드 (localhost:5173)
npm run dev:api    # 백엔드 API (localhost:3001)

# 빌드
npm run build

# DB 관리
npm run db:generate   # 마이그레이션 파일 생성
npm run db:push       # 스키마 DB 반영
npm run db:studio     # Drizzle Studio (DB GUI)
```

### 배포
Vercel에 배포. `vercel.json`으로 라우팅 설정:
- `/api/*` → Hono serverless function
- `/*` → SPA (index.html fallback)
