# AGENTS

- 주석은 한국어로 작성한다.
- 새로운 기능을 구현하기 전 꼭 자신이 수정하는 폴더의 AGENTS.md을 읽고 폴더 구조를 파악한 후 수정해야 한다. 폴더 구조는 각 프로젝트의 docs 내의 architecture.md 또는 app-structure.md 를 참고한다.
- 문서를 작성할 때에는 [writing-docs.md](docs/agents/writing-docs.md)를 참고한다.
- 신규 백엔드 서비스를 생성할 때에는 [new-svc.md](docs/agents/new-svc.md)를 참고한다.
- 명백히 사용자 환경설정이 미비하거나 사용자가 명백히 실행법을 묻는 경우 [user-onboarding.md](docs/agents/user-onboarding.md)를 참고하여 안내한다.
- 사용자의 환경변수와 관련해 문제가 있는 경우 사용자의 동의를 얻어 .env 파일을 확인하고 [api-key-gen.md](docs/agents/api-key-gen.md)를 참고하여 안내할 수 있다.
- 커밋을 작성할 때에는 [git-conventions.md](docs/agents/git-conventions.md)를 참고한다. 단, Push, Staging은 사용자의 명시적 동의가 있을 때에만 가능하며 절대로 임의로 하지 않는다.
- 수정중인 파일은 다른 사용자가 다른 에이전트가 수정할 수 있으며, 절대로 이를 배재한 채 임의로 되돌리거나 checkout 하지 않는다.
- 스테이징되지 않은 파일은 임의로 삭제하지 않으며 /.temp 폴더를 만들고 이동시키는 방식을 활용하고, 사용자의 동의를 얻어 삭제한다.
- 문서나 화면, .env.example 등에 실제 사람의 인명이나 이메일 등을 적지 않는다. "홍길동", example@example.com 등으로 치환하여 적는다.
