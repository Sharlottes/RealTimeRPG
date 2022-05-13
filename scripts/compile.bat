@echo on
@echo 이전 컴파일 데이터 삭제중...
@start /b tsc --build --clean
@if exist build\compile (rd /s /q build\compile)
@echo 컴파일 중...
@start /b tsc --build
@mkdir %cd%\build\compile\assets
@xcopy %cd%\assets %cd%\build\compile\assets /s /e /h /k /y