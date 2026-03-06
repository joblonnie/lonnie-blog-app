# Tiptap WYSIWYG 에디터 도입 설계

## 목표

기존 textarea 기반 마크다운 에디터를 Notion 스타일 WYSIWYG 에디터(Tiptap)로 교체한다.

## 핵심 결정사항

- **라이브러리**: Tiptap (ProseMirror 기반)
- **저장 포맷**: 마크다운 유지 (DB 변경 없음)
- **변환**: `tiptap-markdown`으로 MD ↔ Tiptap JSON 양방향 변환
- **기존 호환**: DocumentView의 react-markdown 렌더링, AI 메타데이터 생성 모두 변경 없음

## 아키텍처

```
DB (마크다운) → 에디터 열기: MD→Tiptap JSON 변환 → WYSIWYG 편집 → 저장: Tiptap JSON→MD 변환 → DB 저장
```

## 패키지

- `@tiptap/react`
- `@tiptap/starter-kit` (볼드, 이탤릭, 헤딩, 리스트, 코드블록 등)
- `@tiptap/extension-link`
- `@tiptap/extension-image`
- `@tiptap/extension-placeholder`
- `tiptap-markdown` (MD ↔ Tiptap 변환)

## 기능 범위

### 플로팅 툴바 (Bubble Menu)
- 텍스트 선택 시 나타나는 플로팅 메뉴
- 볼드, 이탤릭, 스트라이크스루, 코드, 링크 토글
- 헤딩 레벨 선택 (H1~H3)

### 슬래시 명령어 메뉴
- 빈 줄에서 `/` 입력 시 드롭다운 표시
- 명령어: Heading 1~3, Bullet List, Ordered List, Task List, Code Block, Blockquote, Image Upload, Horizontal Rule
- 타이핑으로 필터링

### 드래그앤드롭 이미지
- 에디터에 이미지 드롭 → S3 업로드 (getUploadUrl → uploadFileToS3) → publicUrl로 이미지 노드 삽입
- 업로드 중 임시 플레이스홀더 표시

## 파일 변경 계획

| 작업 | 파일 | 내용 |
|------|------|------|
| 신규 | `src/components/editor/TiptapEditor.tsx` | Tiptap 에디터 코어, 확장 설정, MD↔Tiptap 변환 |
| 신규 | `src/components/editor/BubbleToolbar.tsx` | 플로팅 서식 툴바 |
| 신규 | `src/components/editor/SlashCommandMenu.tsx` | 슬래시 명령어 메뉴 |
| 수정 | `src/components/DocumentEditor.tsx` | textarea → TiptapEditor 교체 |
| 수정 | `package.json` | Tiptap 패키지 추가 |

## 건드리지 않는 것

- `DocumentView.tsx` - 기존 react-markdown 렌더링 유지
- API/DB 스키마 - 마크다운 저장 방식 유지
- AI 메타데이터 생성 - 마크다운 기반이라 변경 불필요

## 구현 순서

1. Tiptap 패키지 설치
2. TiptapEditor.tsx - 기본 에디터 + 마크다운 변환 연동
3. BubbleToolbar.tsx - 플로팅 툴바
4. SlashCommandMenu.tsx - 슬래시 명령어
5. 이미지 드래그앤드롭 핸들러 (S3 업로드 연동)
6. DocumentEditor.tsx 통합
