git add .
git commit -m "update with deploy"
git push
yarn run compile
:: 여기서부턴 js 로 컴파일된 파일을 넣는 걸로 최적화예정...
git push heroku master
wsl heroku logs --tail
