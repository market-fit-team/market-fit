import sys
import types

# lightgbm은 OpenMP 네이티브 라이브러리가 필요해 순수 로직 테스트 환경에선 import만 스텁한다.
# (Booster를 직접 호출하는 테스트는 두지 않는다.)
sys.modules.setdefault("lightgbm", types.ModuleType("lightgbm"))
